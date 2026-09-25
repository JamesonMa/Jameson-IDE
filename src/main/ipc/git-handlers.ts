import simpleGit, { SimpleGit } from 'simple-git';
import * as electron from 'electron';
import { IPC } from '@shared/types/ipc';
import * as path from 'path';

const { BrowserWindow, ipcMain } = electron;
type BrowserWindowType = electron.BrowserWindow;

const workspaceRoots = new WeakMap<BrowserWindowType, string>();

function validRelativePath(root: string, value: string): boolean {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) return false;
  const rel = path.relative(root, path.resolve(root, value));
  return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel);
}

export function registerGitHandlers(win: BrowserWindowType) {
  workspaceRoots.set(win, process.cwd());
  const git = (owner: BrowserWindowType): SimpleGit => simpleGit(workspaceRoots.get(owner) || process.cwd());
  ipcMain.handle(IPC.GIT.IS_REPO, async (event, requestedRoot: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const configured = workspaceRoots.get(owner);
    const root = configured && typeof requestedRoot === 'string' && path.resolve(requestedRoot) === path.resolve(configured) ? configured : null;
    if (!root) return false;
    try { return (await simpleGit(root).checkIsRepo()); } catch { return false; }
  });
  ipcMain.handle(IPC.GIT.STATUS, async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    try { const s = await git(owner).status();
      return { branch: s.current || '', ahead: s.ahead, behind: s.behind,
        files: s.files.map((f) => ({ path: f.path, index: f.index, workingDir: f.working_dir })) }; }
    catch (err) { throw new Error(`Git status failed: ${err instanceof Error ? err.message : String(err)}`); }
  });
  ipcMain.handle(IPC.GIT.DIFF_FILE, async (_event, filePath: string) => {
    const owner = BrowserWindow.fromWebContents(_event.sender) || win;
    const root = workspaceRoots.get(owner) || process.cwd();
    if (!validRelativePath(root, filePath)) throw new Error('Invalid git path');
    const text = (await git(owner).diff([ '--', filePath ])).slice(0, 2_000_000);
    const additions = (text.match(/^\+(?!\+\+)/gm) || []).length;
    const deletions = (text.match(/^-(?!--)/gm) || []).length;
    return { path: filePath, hunks: text, additions, deletions };
  });
  ipcMain.handle(IPC.GIT.STAGE, async (event, paths: string[]) => { const owner = BrowserWindow.fromWebContents(event.sender) || win; const root = workspaceRoots.get(owner) || process.cwd(); if (!Array.isArray(paths) || paths.some((p) => !validRelativePath(root, p))) throw new Error('Invalid paths'); await git(owner).add(paths); });
  ipcMain.handle(IPC.GIT.UNSTAGE, async (event, paths: string[]) => { const owner = BrowserWindow.fromWebContents(event.sender) || win; const root = workspaceRoots.get(owner) || process.cwd(); if (!Array.isArray(paths) || paths.some((p) => !validRelativePath(root, p))) throw new Error('Invalid paths'); await git(owner).reset(['HEAD', '--', ...paths]); });
  ipcMain.handle(IPC.GIT.COMMIT, async (event, message: string) => { const owner = BrowserWindow.fromWebContents(event.sender) || win; if (!message?.trim()) throw new Error('Commit message is required'); return (await git(owner).commit(message)).commit; });
  ipcMain.handle(IPC.GIT.LOG, async (event) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const log = await git(owner).log();
    return log.all.map((e) => ({ hash: e.hash, date: e.date, message: e.message, author: e.author_name }));
  });
  ipcMain.handle(IPC.GIT.BRANCH, async (event) => (await git(BrowserWindow.fromWebContents(event.sender) || win).branch()).current || '');
}

export function setGitWorkspaceRoot(root: string, win?: BrowserWindowType) { if (win) workspaceRoots.set(win, root); }
