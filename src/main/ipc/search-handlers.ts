import * as fs from 'fs';
import * as path from 'path';
import * as electron from 'electron';
import { IPC, SearchResult, SearchOptions } from '@shared/types/ipc';

const { BrowserWindow, ipcMain } = electron;
type BrowserWindowType = electron.BrowserWindow;

const workspaceRoots = new WeakMap<BrowserWindowType, string>();

function withinRoot(root: string, candidate: string): boolean {
  const rel = path.relative(root, path.resolve(candidate));
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel));
}

async function searchText(filePath: string, query: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
  if (typeof filePath !== 'string' || typeof query !== 'string' || !query || query.length > 10000) return [];
  const maxResults = opts.maxResults === undefined ? undefined : Number.isFinite(opts.maxResults) ? Math.max(0, Math.floor(opts.maxResults)) : undefined;
  if (maxResults === 0) return [];
  const stat = await fs.promises.stat(filePath);
  if (stat.size > 10 * 1024 * 1024) return [];
  const buffer = await fs.promises.readFile(filePath);
  if (buffer.includes(0)) return [];
  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/);
  const needle = opts.caseSensitive ? query : query.toLowerCase();
  const results: SearchResult[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const haystack = opts.caseSensitive ? line : line.toLowerCase();
    let offset = 0;
    while ((offset = haystack.indexOf(needle, offset)) >= 0) {
      results.push({ path: filePath, line: index + 1, column: offset + 1, text: line,
        matchStart: offset, matchEnd: offset + query.length });
      if (maxResults !== undefined && results.length >= maxResults) return results;
      offset += Math.max(1, query.length);
    }
  }
  return results;
}

async function walk(root: string, out: string[] = []) {
  let entries: fs.Dirent[]; try { entries = await fs.promises.readdir(root, { withFileTypes: true }); } catch { return out; }
  for (const entry of entries) {
    if (entry.isSymbolicLink() || entry.name.startsWith('.')
      || entry.name === 'node_modules' || entry.name === 'dist'
      || entry.name === 'compilers' || entry.name === 'release'
      || entry.name === 'build' || entry.name === 'out') continue;
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) await walk(full, out); else out.push(full);
  }
  return out;
}

export function registerSearchHandlers(_win: BrowserWindowType) {
  ipcMain.handle(IPC.SEARCH.IN_FILE, async (event, filePath: string, query: string, opts: SearchOptions = {}) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || _win;
    const root = workspaceRoots.get(owner);
    if (!root || typeof filePath !== 'string' || !withinRoot(root, filePath)) throw new Error('Search path is outside the workspace');
    try {
      const stat = await fs.promises.lstat(filePath);
      if (stat.isSymbolicLink() || !stat.isFile()) return [];
      return await searchText(filePath, query, opts);
    } catch { return []; }
  });
  ipcMain.handle(IPC.SEARCH.IN_WORKSPACE, async (event, requestedRoot: string, query: string, opts: SearchOptions = {}) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || _win;
    const root = workspaceRoots.get(owner);

    // Require workspace to be open - don't allow renderer to specify arbitrary search roots
    if (!root) throw new Error('No workspace is open. Open a workspace folder first.');
    const searchRoot = root;

    const resolvedRoot = path.resolve(searchRoot);
    if (!path.isAbsolute(resolvedRoot)) throw new Error('Search root must be absolute');

    const rootStat = await fs.promises.lstat(resolvedRoot);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Search root is not a directory');
    const results: SearchResult[] = [];
    const needle = opts.caseSensitive ? query : query.toLowerCase();
    for (const file of await walk(resolvedRoot)) {
      // Check if filename matches the query
      const filename = path.basename(file);
      const filenameMatch = opts.caseSensitive ? filename : filename.toLowerCase();
      if (filenameMatch.includes(needle)) {
        results.push({ path: file, line: 1, column: 1, text: filename, matchStart: 0, matchEnd: needle.length });
        const maxResults = opts?.maxResults !== undefined && Number.isFinite(opts.maxResults)
          ? Math.max(0, Math.floor(opts.maxResults)) : undefined;
        if (maxResults !== undefined && results.length >= maxResults) return results.slice(0, maxResults);
      }
      // Also search file content
      try { results.push(...await searchText(file, query, { ...opts, maxResults: undefined })); } catch { /* files can disappear during a search */ }
      const maxResults = opts?.maxResults !== undefined && Number.isFinite(opts.maxResults)
        ? Math.max(0, Math.floor(opts.maxResults)) : undefined;
      if (maxResults !== undefined && results.length >= maxResults) return results.slice(0, maxResults);
    }
    return results;
  });
}

export function setSearchWorkspaceRoot(root: string, win: BrowserWindowType) {
  const resolved = path.resolve(root);
  workspaceRoots.set(win, resolved);
}
