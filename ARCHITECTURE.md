# Architecture

The Electron main process owns windows and registers IPC handlers under `src/main/ipc/`. The preload script exposes only the typed operations in `src/shared/types/ipc.ts`. Renderer components under `src/renderer/components/` use that bridge and never import Node APIs.

Workspace, watcher, Git, and terminal state is keyed by `BrowserWindow` where state can differ between windows. File writes use temporary files followed by rename, and all filesystem paths are checked against the active workspace.
