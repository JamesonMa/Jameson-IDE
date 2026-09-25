import * as fs from 'fs';
import * as path from 'path';
import chokidar from 'chokidar';
import Store from 'electron-store';
import { IPC, FileNode, FileReadResult } from '@shared/types/ipc';
import * as electron from 'electron';
import { setGitWorkspaceRoot } from './git-handlers';
import { setSearchWorkspaceRoot } from './search-handlers';
import { setTerminalWorkspaceRoot } from './terminal-handlers';

const { BrowserWindow, ipcMain, dialog } = electron;
type BrowserWindowType = electron.BrowserWindow;

const store = new Store();
const workspaceRoots = new WeakMap<BrowserWindowType, string>();
const approvedRoots = new WeakMap<BrowserWindowType, Set<string>>();
const watchers = new WeakMap<BrowserWindowType, ReturnType<typeof chokidar.watch>>();
const recentWorkspaces: string[] = (store.get('recentWorkspaces') as string[]) || [];
const writeLocks = new Map<string, Promise<void>>();

function rememberWorkspace(rootPath: string) {
  const normalized = path.resolve(rootPath);
  const existing = recentWorkspaces.indexOf(normalized);
  if (existing >= 0) recentWorkspaces.splice(existing, 1);
  recentWorkspaces.unshift(normalized);
  if (recentWorkspaces.length > 10) recentWorkspaces.length = 10;
  store.set('recentWorkspaces', recentWorkspaces);
  store.set('lastWorkspace', normalized);
}

function getRoot(win: BrowserWindowType): string { return workspaceRoots.get(win) || ''; }
async function safePath(win: BrowserWindowType, candidate: string): Promise<string> {
  if (typeof candidate !== 'string' || !candidate.trim()) throw new Error('Invalid path');
  const resolved = path.resolve(candidate);
  const root = getRoot(win);

  // Require workspace to be open - without this check, any file on the system could be read
  if (!root) {
    throw new Error('No workspace is open. Open a workspace folder first.');
  }

  const realRoot = await fs.promises.realpath(root);
  let probe = resolved;
  while (true) {
    try {
      const realProbe = await fs.promises.realpath(probe);
      const relativeReal = path.relative(realRoot, realProbe);
      if (relativeReal === '..' || relativeReal.startsWith(`..${path.sep}`) || path.isAbsolute(relativeReal)) throw new Error('Path resolves outside the workspace');
      break;
    } catch (error: any) {
      if (error?.code !== 'ENOENT' || probe === path.dirname(probe)) throw error;
      probe = path.dirname(probe);
    }
  }
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Path is outside the workspace');
  }

  return resolved;
}

export function registerFileHandlers(win: BrowserWindowType) {
  ipcMain.handle(IPC.FILE.READ, async (event, filePath: string): Promise<FileReadResult> => {
    const target = await safePath(BrowserWindow.fromWebContents(event.sender)!, filePath);
    const stat = await fs.promises.stat(target);
    if (stat.size > 25 * 1024 * 1024) throw new Error('File is too large to open');
    const data = await fs.promises.readFile(target);
    if (data.includes(0)) throw new Error('Binary files are not supported by the text editor');
    const content = data.toString('utf-8');
    return { content, encoding: 'utf-8' };
  });

  ipcMain.handle(IPC.FILE.WRITE, async (event, filePath: string, content: string) => {
    const target = await safePath(BrowserWindow.fromWebContents(event.sender)!, filePath);
    const previous = writeLocks.get(target) || Promise.resolve();
    const current = previous.then(async () => {
      const temp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await fs.promises.writeFile(temp, content, 'utf-8');
      await fs.promises.rename(temp, target).catch(async (err) => { await fs.promises.rm(temp, { force: true }); throw err; });
    });
    writeLocks.set(target, current);
    try { await current; } finally { if (writeLocks.get(target) === current) writeLocks.delete(target); }
  });

  ipcMain.handle(IPC.FILE.CREATE_FILE, async (event, dirPath: string, name: string) => {
    const filePath = await safePath(BrowserWindow.fromWebContents(event.sender)!, path.join(dirPath, name));
    if (path.basename(filePath) !== name) throw new Error('Invalid file name');
    await fs.promises.writeFile(filePath, '', { encoding: 'utf-8', flag: 'wx' });
    return filePath;
  });

  ipcMain.handle(IPC.FILE.CREATE_DIR, async (event, dirPath: string, name: string) => {
    const newDir = await safePath(BrowserWindow.fromWebContents(event.sender)!, path.join(dirPath, name));
    if (path.basename(newDir) !== name) throw new Error('Invalid directory name');
    await fs.promises.mkdir(newDir, { recursive: true });
    return newDir;
  });

  ipcMain.handle(IPC.FILE.RENAME, async (event, oldPath: string, newName: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender)!;
    const oldTarget = await safePath(owner, oldPath);
    const newPath = await safePath(owner, path.join(path.dirname(oldTarget), newName));
    if (path.basename(newPath) !== newName) throw new Error('Invalid name');
    try { await fs.promises.lstat(newPath); throw new Error('A file or folder with that name already exists'); } catch (err: any) { if (err?.code !== 'ENOENT') throw err; }
    try { await fs.promises.rename(oldTarget, newPath); }
    catch (err: any) {
      if (err?.code !== 'EXDEV') throw err;
      await fs.promises.cp(oldTarget, newPath, { recursive: true, errorOnExist: true });
      await fs.promises.rm(oldTarget, { recursive: true });
    }
    return newPath;
  });

  ipcMain.handle(IPC.FILE.DELETE, async (event, targetPath: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender)!;
    const target = await safePath(owner, targetPath);
    const root = getRoot(owner);

    // Prevent deleting workspace root
    if (path.resolve(target) === path.resolve(root)) {
      throw new Error('Cannot delete the workspace root');
    }

    // Prevent deleting outside workspace
    if (root && !target.startsWith(root)) {
      throw new Error('Cannot delete files outside the workspace');
    }

    // Check if target exists and get its stats
    let stats: fs.Stats;
    try {
      stats = await fs.promises.stat(target);
    } catch (err: any) {
      if (err?.code === 'ENOENT') return; // Already deleted
      throw new Error(`Failed to access file: ${err?.message || err}`);
    }

    // For directories, add extra safety checks
    if (stats.isDirectory()) {
      // Prevent deleting system directories
      const basename = path.basename(target);
      const dangerousDirs = ['node_modules', '.git', 'dist', 'build', 'out'];
      if (dangerousDirs.includes(basename)) {
        throw new Error(`Cannot delete protected directory: ${basename}`);
      }

      // Delete with recursive flag
      try {
        await fs.promises.rm(target, { recursive: true, force: false });
      } catch (err: any) {
        throw new Error(`Failed to delete directory: ${err?.message || err}`);
      }
    } else {
      // For files, simple unlink
      try {
        await fs.promises.unlink(target);
      } catch (err: any) {
        throw new Error(`Failed to delete file: ${err?.message || err}`);
      }
    }
  });

  ipcMain.handle(IPC.FILE.LIST_DIR, async (event, dirPath: string): Promise<FileNode[]> => {
    return listDirectory(await safePath(BrowserWindow.fromWebContents(event.sender)!, dirPath));
  });

  ipcMain.handle(IPC.FILE.WATCH, async (event, watchPath: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const old = watchers.get(owner); if (old) await old.close();
    const current = chokidar.watch(await safePath(owner, watchPath), {
      ignored: /(^|[\/\\])(\.|node_modules|dist)/,
      persistent: true,
      ignoreInitial: true,
    });
    current.on('all', (eventType: string, filePath: string) => {
      const typeMap: Record<string, string> = {
        add: 'add', change: 'change', unlink: 'unlink',
        addDir: 'addDir', unlinkDir: 'unlinkDir',
      };
      const type = typeMap[eventType];
      if (type && owner && !owner.isDestroyed() && !owner.webContents.isDestroyed()) {
        owner.webContents.send(IPC.FILE.WATCH_EVENT, { type, path: filePath });
      }
    });
    watchers.set(owner, current);
  });

  ipcMain.handle(IPC.FILE.UNWATCH, async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const current = watchers.get(owner); if (current) { await current.close(); watchers.delete(owner); }
  });
}

async function listDirectory(dirPath: string): Promise<FileNode[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);
    const node: FileNode = {
      name: entry.name,
      path: fullPath,
      type: entry.isDirectory() ? 'directory' : 'file',
    };

    if (entry.isDirectory()) {
      try {
        node.children = await listDirectory(fullPath);
      } catch {
        node.children = [];
      }
    }

    nodes.push(node);
  }

  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return nodes;
}

export function registerWorkspaceHandlers(win: BrowserWindowType) {
  approvedRoots.set(win, new Set());
  ipcMain.handle(IPC.WORKSPACE.OPEN_DIALOG, async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const result = await dialog.showOpenDialog(owner, {
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const root = path.resolve(result.filePaths[0]);
    const stat = await fs.promises.stat(root);
    if (!stat.isDirectory()) throw new Error('Workspace is not a directory');
    approvedRoots.get(owner)?.add(root);
    workspaceRoots.set(owner, root);
    rememberWorkspace(root); setGitWorkspaceRoot(root, owner); setSearchWorkspaceRoot(root, owner); setTerminalWorkspaceRoot(root, owner); return root;
  });

  ipcMain.handle(IPC.WORKSPACE.OPEN, async (event, rootPath: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const root = path.resolve(rootPath);

    // Validate path safety
    if (!root || root === '/' || root.match(/^[A-Z]:\\?$/i)) {
      throw new Error('Cannot open root directory as workspace');
    }

    // Block dangerous system directories
    const normalized = root.toLowerCase().replace(/\\/g, '/');
    const dangerousPaths = [
      '/windows', '/system32', '/program files', '/program files (x86)',
      'c:/windows', 'c:/program files', 'c:/program files (x86)',
    ];
    if (dangerousPaths.some(dp => normalized === dp || normalized.startsWith(dp + '/'))) {
      throw new Error('Cannot open system directories as workspace');
    }

    // Verify it exists and is a directory
    let stat: fs.Stats;
    try {
      stat = await fs.promises.stat(root);
    } catch (err: any) {
      throw new Error(`Workspace path does not exist: ${err?.message || err}`);
    }
    if (!stat.isDirectory()) {
      throw new Error('Workspace is not a directory');
    }

    // Verify it was approved through dialog or is in recent workspaces
    const approved = approvedRoots.get(owner);
    if (!approved?.has(root) && !recentWorkspaces.includes(root) && workspaceRoots.get(owner) !== root) {
      throw new Error('Workspace must be selected through the folder dialog');
    }

    workspaceRoots.set(owner, root);
    rememberWorkspace(root);
    setGitWorkspaceRoot(root, owner);
    setSearchWorkspaceRoot(root, owner);
    setTerminalWorkspaceRoot(root, owner);
    return root;
  });

  ipcMain.handle(IPC.WORKSPACE.GET_ROOT, async (event) => {
    return getRoot(BrowserWindow.fromWebContents(event.sender) || win);
  });

  ipcMain.handle(IPC.WORKSPACE.GET_RECENT, async () => [...recentWorkspaces]);

  ipcMain.handle(IPC.DIALOG.OPEN_FOLDER, async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const result = await dialog.showOpenDialog(owner, { properties: ['openDirectory'] });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC.DIALOG.OPEN_FILE, async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const result = await dialog.showOpenDialog(owner, { properties: ['openFile'] });
    return result.canceled || result.filePaths.length === 0 ? null : result.filePaths[0];
  });
}

export function getLastWorkspace(): string {
  return (store.get('lastWorkspace') as string) || '';
}
