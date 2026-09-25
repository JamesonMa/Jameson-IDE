# Repository Guidelines

## Project Structure & Module Organization

Jameson IDE is an Electron/TypeScript application. Keep process-specific code separated:

- `src/main/` contains the Electron main process and IPC handlers.
- `src/preload/` exposes the context-isolated renderer API.
- `src/renderer/` contains the Monaco UI, components, and `styles/main.css`.
- `src/shared/types/` holds contracts shared across process boundaries.
- `assets/` stores application assets; `compilers/` contains bundled third-party runtimes.
- `dist/` and `release/` are generated build and installer outputs. Do not edit them directly.

Webpack configuration lives at the root. The standalone `jameson-ide.html` is separate from the packaged renderer; keep behavior consistent when modifying either interface.

## Build, Test, and Development Commands

Install dependencies with `npm ci`.

- `npm run build` cleans `dist/`, compiles main and renderer bundles, and builds the preload script.
- `npm start` performs a full build and launches Electron.
- `npm run dev` builds once, then watches all TypeScript/Webpack targets.
- `npm run rebuild` rebuilds the native `node-pty` dependency for the installed Electron version.
- `npm run dist` creates a Windows NSIS installer under `release/`.

## Coding Style & Naming Conventions

Follow the existing TypeScript style: two-space indentation, single quotes, semicolons, trailing commas in multiline objects, and strict typing. Use `PascalCase` for classes and types, `camelCase` for functions and variables, and kebab-case filenames such as `file-explorer.ts`. Keep IPC channel names and payload types centralized in `src/shared/types/ipc.ts`. Preserve Electron's security boundary: renderer code should use the preload API rather than importing Node APIs.

No formatter or linter is configured; match nearby code and ensure `npm run build` succeeds.

## Testing Guidelines

There is no application test framework or coverage threshold. Run `npm run build`, then smoke-test the affected workflow with `npm start` (startup, files, editor, terminal, or code execution). Files in `compilers/**/tests` belong to bundled runtimes, not this project. Place new automated tests beside source as `*.test.ts` and add an npm script.

## Commit & Pull Request Guidelines

This checkout has no commit history from which to infer a convention. Use short, imperative subjects, optionally with a Conventional Commit prefix, for example `fix: restore terminal resize handling`. Keep commits focused. Pull requests should explain the user-visible change, list validation commands and manual checks, link relevant issues, and include screenshots or recordings for UI changes. Do not commit generated `dist/`, `release/`, logs, or dependency directories.
