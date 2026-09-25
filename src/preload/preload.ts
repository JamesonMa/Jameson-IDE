import { contextBridge, ipcRenderer } from 'electron';
import { IPC, SearchOptions, WatchEventPayload, GitStatusResult, GitDiffResult, GitLogEntry } from '../shared/types/ipc';

contextBridge.exposeInMainWorld('api', {
  file: {
    read: (path: string) => ipcRenderer.invoke(IPC.FILE.READ, path),
    write: (path: string, content: string) => ipcRenderer.invoke(IPC.FILE.WRITE, path, content),
    createFile: (dir: string, name: string) => ipcRenderer.invoke(IPC.FILE.CREATE_FILE, dir, name),
    createDir: (dir: string, name: string) => ipcRenderer.invoke(IPC.FILE.CREATE_DIR, dir, name),
    rename: (oldPath: string, newName: string) => ipcRenderer.invoke(IPC.FILE.RENAME, oldPath, newName),
    delete: (path: string) => ipcRenderer.invoke(IPC.FILE.DELETE, path),
    listDir: (path: string) => ipcRenderer.invoke(IPC.FILE.LIST_DIR, path),
    watch: (path: string) => ipcRenderer.invoke(IPC.FILE.WATCH, path),
    unwatch: (path: string) => ipcRenderer.invoke(IPC.FILE.UNWATCH, path),
    onWatchEvent: (callback: (payload: WatchEventPayload) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: WatchEventPayload) => callback(payload);
      ipcRenderer.on(IPC.FILE.WATCH_EVENT, handler);
      return () => ipcRenderer.removeListener(IPC.FILE.WATCH_EVENT, handler);
    },
  },
  workspace: {
    open: (path: string) => ipcRenderer.invoke(IPC.WORKSPACE.OPEN, path),
    openDialog: () => ipcRenderer.invoke(IPC.WORKSPACE.OPEN_DIALOG),
    getRoot: () => ipcRenderer.invoke(IPC.WORKSPACE.GET_ROOT),
    getRecent: () => ipcRenderer.invoke(IPC.WORKSPACE.GET_RECENT),
  },
  git: {
    status: () => ipcRenderer.invoke(IPC.GIT.STATUS) as Promise<GitStatusResult>,
    diffFile: (path: string) => ipcRenderer.invoke(IPC.GIT.DIFF_FILE, path) as Promise<GitDiffResult>,
    stage: (paths: string[]) => ipcRenderer.invoke(IPC.GIT.STAGE, paths),
    unstage: (paths: string[]) => ipcRenderer.invoke(IPC.GIT.UNSTAGE, paths),
    commit: (msg: string) => ipcRenderer.invoke(IPC.GIT.COMMIT, msg),
    log: () => ipcRenderer.invoke(IPC.GIT.LOG) as Promise<GitLogEntry[]>,
    branch: () => ipcRenderer.invoke(IPC.GIT.BRANCH),
    isRepo: (path: string) => ipcRenderer.invoke(IPC.GIT.IS_REPO, path),
  },
  terminal: {
    create: (cols: number, rows: number) => ipcRenderer.invoke(IPC.TERMINAL.CREATE, cols, rows),
    write: (id: string, data: string) => ipcRenderer.invoke(IPC.TERMINAL.WRITE, id, data),
    resize: (id: string, cols: number, rows: number) => ipcRenderer.invoke(IPC.TERMINAL.RESIZE, id, cols, rows),
    kill: (id: string) => ipcRenderer.invoke(IPC.TERMINAL.KILL, id),
    run: (id: string, filePath: string, language: string) => ipcRenderer.invoke(IPC.TERMINAL.RUN, id, filePath, language),
    onData: (callback: (payload: { id: string; data: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: { id: string; data: string }) => callback(payload);
      ipcRenderer.on(IPC.TERMINAL.DATA, handler);
      return () => ipcRenderer.removeListener(IPC.TERMINAL.DATA, handler);
    },
    onExited: (callback: (payload: { id: string; exitCode: number }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, payload: { id: string; exitCode: number }) => callback(payload);
      ipcRenderer.on(IPC.TERMINAL.EXITED, handler);
      return () => ipcRenderer.removeListener(IPC.TERMINAL.EXITED, handler);
    },
  },
  search: {
    inFile: (path: string, query: string, opts: SearchOptions = {}) => ipcRenderer.invoke(IPC.SEARCH.IN_FILE, path, query, opts),
    inWorkspace: (root: string, query: string, opts: SearchOptions = {}) => ipcRenderer.invoke(IPC.SEARCH.IN_WORKSPACE, root, query, opts),
  },
  dialog: {
    openFolder: () => ipcRenderer.invoke(IPC.DIALOG.OPEN_FOLDER),
    openFile: () => ipcRenderer.invoke(IPC.DIALOG.OPEN_FILE),
  },
});
