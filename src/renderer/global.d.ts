import type { SearchOptions, SearchResult, WatchEventPayload, GitStatusResult, GitDiffResult, GitLogEntry } from '../shared/types/ipc';

declare global {
  interface Window {
    api: {
      file: {
        read: (path: string) => Promise<{ content: string; encoding: string }>;
        write: (path: string, content: string) => Promise<void>;
        createFile: (dir: string, name: string) => Promise<string>;
        createDir: (dir: string, name: string) => Promise<string>;
        rename: (oldPath: string, newName: string) => Promise<string>;
        delete: (path: string) => Promise<void>;
        listDir: (path: string) => Promise<FileNode[]>;
        watch: (path: string) => Promise<void>;
        unwatch: (path: string) => Promise<void>;
        onWatchEvent: (callback: (payload: WatchEventPayload) => void) => () => void;
      };
      workspace: {
        open: (path: string) => Promise<string>;
        openDialog: () => Promise<string | null>;
        getRoot: () => Promise<string>;
        getRecent: () => Promise<string[]>;
      };
      git: {
        status: () => Promise<GitStatusResult>;
        diffFile: (path: string) => Promise<GitDiffResult>;
        stage: (paths: string[]) => Promise<void>;
        unstage: (paths: string[]) => Promise<void>;
        commit: (msg: string) => Promise<string>;
        log: () => Promise<GitLogEntry[]>;
        branch: () => Promise<string>;
        isRepo: (path: string) => Promise<boolean>;
      };
      terminal: {
        create: (cols: number, rows: number) => Promise<string>;
        write: (id: string, data: string) => Promise<void>;
        resize: (id: string, cols: number, rows: number) => Promise<void>;
        kill: (id: string) => Promise<void>;
        run: (id: string, filePath: string, language: string) => Promise<void>;
        onData: (callback: (payload: { id: string; data: string }) => void) => () => void;
        onExited: (callback: (payload: { id: string; exitCode: number }) => void) => () => void;
      };
      search: {
        inFile: (path: string, query: string, opts?: SearchOptions) => Promise<SearchResult[]>;
        inWorkspace: (root: string, query: string, opts?: SearchOptions) => Promise<SearchResult[]>;
      };
      dialog: {
        openFolder: () => Promise<string | null>;
        openFile: () => Promise<string | null>;
      };
    };
  }

  interface FileNode {
    name: string;
    path: string;
    type: 'file' | 'directory';
    children?: FileNode[];
  }
}

export {};
