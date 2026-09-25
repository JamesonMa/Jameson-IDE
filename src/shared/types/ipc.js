"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC = void 0;
exports.IPC = {
    FILE: {
        READ: 'file:read',
        WRITE: 'file:write',
        CREATE_FILE: 'file:create-file',
        CREATE_DIR: 'file:create-dir',
        RENAME: 'file:rename',
        DELETE: 'file:delete',
        LIST_DIR: 'file:list-dir',
        WATCH: 'file:watch',
        UNWATCH: 'file:unwatch',
        WATCH_EVENT: 'file:watch-event',
    },
    WORKSPACE: {
        OPEN: 'workspace:open',
        OPEN_DIALOG: 'workspace:open-dialog',
        GET_ROOT: 'workspace:get-root',
        GET_RECENT: 'workspace:get-recent',
    },
    GIT: {
        STATUS: 'git:status',
        DIFF_FILE: 'git:diff-file',
        STAGE: 'git:stage',
        UNSTAGE: 'git:unstage',
        COMMIT: 'git:commit',
        LOG: 'git:log',
        BRANCH: 'git:branch',
        IS_REPO: 'git:is-repo',
    },
    TERMINAL: {
        CREATE: 'terminal:create',
        WRITE: 'terminal:write',
        DATA: 'terminal:data',
        RESIZE: 'terminal:resize',
        KILL: 'terminal:kill',
        EXITED: 'terminal:exited',
    },
    SEARCH: {
        IN_FILE: 'search:in-file',
        IN_WORKSPACE: 'search:in-workspace',
    },
    DIALOG: {
        OPEN_FILE: 'dialog:open-file',
        OPEN_FOLDER: 'dialog:open-folder',
        SAVE_FILE: 'dialog:save-file',
    },
    APP: {
        QUIT: 'app:quit',
    },
};
