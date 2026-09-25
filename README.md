# Jameson IDE

Jameson IDE is an Electron/TypeScript code editor with Monaco, an integrated terminal, workspace search, and Git status tools.

## Development

```powershell
npm ci
npm run build
npm start
```

`npm run dev` performs an initial build and watches the main, preload, and renderer bundles. Native `node-pty` can be rebuilt for the installed Electron version with `npm run rebuild`.

## Security model

The renderer has no Node integration. Filesystem, terminal, search, and Git access cross the context-isolated preload bridge through typed IPC channels. File operations are constrained to the active workspace, writes are atomic, and markdown preview removes executable elements and event-handler attributes.

## Keyboard shortcuts

- `Ctrl/Cmd+S`: save the active file
- `Ctrl/Cmd+mouse wheel`: change editor font size
- `Enter` or `Space` on a file-tree item: open or expand it

Generated `dist/` and `release/` output is not source and should not be edited manually.
