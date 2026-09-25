export const IPC = {
  FILE: {
    READ:          'file:read',
    WRITE:         'file:write',
    CREATE_FILE:   'file:create-file',
    CREATE_DIR:    'file:create-dir',
    RENAME:        'file:rename',
    DELETE:        'file:delete',
    LIST_DIR:      'file:list-dir',
    WATCH:         'file:watch',
    UNWATCH:       'file:unwatch',
    WATCH_EVENT:   'file:watch-event',
  },
  WORKSPACE: {
    OPEN:          'workspace:open',
    OPEN_DIALOG:   'workspace:open-dialog',
    GET_ROOT:      'workspace:get-root',
    GET_RECENT:    'workspace:get-recent',
  },
  GIT: {
    STATUS:        'git:status',
    DIFF_FILE:     'git:diff-file',
    STAGE:         'git:stage',
    UNSTAGE:       'git:unstage',
    COMMIT:        'git:commit',
    LOG:           'git:log',
    BRANCH:        'git:branch',
    IS_REPO:       'git:is-repo',
  },
  TERMINAL: {
    CREATE:        'terminal:create',
    WRITE:         'terminal:write',
    DATA:          'terminal:data',
    RESIZE:        'terminal:resize',
    KILL:          'terminal:kill',
    RUN:           'terminal:run',
    EXITED:        'terminal:exited',
  },
  SEARCH: {
    IN_FILE:       'search:in-file',
    IN_WORKSPACE:  'search:in-workspace',
  },
  DIALOG: {
    OPEN_FILE:     'dialog:open-file',
    OPEN_FOLDER:   'dialog:open-folder',
    SAVE_FILE:     'dialog:save-file',
  },
  APP: {
    QUIT:          'app:quit',
  },
} as const;

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export interface FileReadResult {
  content: string;
  encoding: string;
}

export interface GitFileStatus {
  path: string;
  index: string;
  workingDir: string;
}

export interface GitStatusResult {
  branch: string;
  ahead: number;
  behind: number;
  files: GitFileStatus[];
}

export interface GitDiffResult {
  path: string;
  hunks: string;
  additions: number;
  deletions: number;
}

export interface GitLogEntry {
  hash: string;
  date: string;
  message: string;
  author: string;
}

export interface SearchResult {
  path: string;
  line: number;
  column: number;
  text: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchOptions {
  caseSensitive?: boolean;
  maxResults?: number;
}

export interface TerminalDataPayload {
  id: string;
  data: string;
}

export interface TerminalExitedPayload {
  id: string;
  exitCode: number;
}

export interface WatchEventPayload {
  type: 'add' | 'change' | 'unlink' | 'addDir' | 'unlinkDir';
  path: string;
}

export interface Settings {
  theme: 'light' | 'dark';
  fontSize: number;
  fontFamily: string;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  showHiddenFiles: boolean;
  recentWorkspaces: string[];
  terminalShell: string;
  terminalFontSize: number;
}
