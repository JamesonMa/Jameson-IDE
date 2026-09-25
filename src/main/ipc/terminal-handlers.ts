import * as pty from 'node-pty';
import * as electron from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { IPC, TerminalDataPayload, TerminalExitedPayload } from '@shared/types/ipc';

const { BrowserWindow, ipcMain } = electron;
type BrowserWindowType = electron.BrowserWindow;

const terminalSets = new WeakMap<BrowserWindowType, Map<string, pty.IPty>>();
const workspaceRoots = new WeakMap<BrowserWindowType, string>();
const runningProcesses = new WeakMap<BrowserWindowType, Map<string, ChildProcess>>();
// Compiled programs keyed by their output path, so a re-run from any terminal
// stops the instance holding the executable the linker needs to replace.
const outputProcesses = new WeakMap<BrowserWindowType, Map<string, ChildProcess>>();

export function registerTerminalHandlers(win: BrowserWindowType) {
  const terminals = new Map<string, pty.IPty>();
  terminalSets.set(win, terminals);
  runningProcesses.set(win, new Map());
  ipcMain.handle(IPC.TERMINAL.CREATE, async (event, cols: number, rows: number): Promise<string> => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const ownedTerminals = terminalSets.get(owner) || terminals;
    const shell = process.platform === 'win32' ? 'cmd.exe' : 'bash';
    const id = `term-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // node-pty rejects zero/NaN dimensions; clamp renderer-provided values.
    const safeCols = Number.isFinite(cols) ? Math.max(2, Math.floor(cols)) : 80;
    const safeRows = Number.isFinite(rows) ? Math.max(1, Math.floor(rows)) : 24;
    const cwd = process.env.HOME || process.env.USERPROFILE || process.cwd();
    const env = Object.fromEntries(
      Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
    );

    let term: pty.IPty;
    try { term = pty.spawn(shell, [], {
      name: 'xterm-256color',
      cols: safeCols,
      rows: safeRows,
      cwd,
      env,
    }); } catch (err) { throw new Error(`Unable to start terminal: ${err instanceof Error ? err.message : String(err)}`); }

    ownedTerminals.set(id, term);

    term.onData((data) => {
      if (ownedTerminals.get(id) === term && owner && !owner.isDestroyed() && !owner.webContents.isDestroyed()) {
        const payload: TerminalDataPayload = { id, data };
        owner.webContents.send(IPC.TERMINAL.DATA, payload);
      }
    });

    term.onExit(({ exitCode }) => {
      ownedTerminals.delete(id);
      if (owner && !owner.isDestroyed() && !owner.webContents.isDestroyed()) {
        const payload: TerminalExitedPayload = { id, exitCode };
        owner.webContents.send(IPC.TERMINAL.EXITED, payload);
      }
    });

    return id;
  });

  ipcMain.handle(IPC.TERMINAL.WRITE, async (event, id: string, data: string) => {
    if (typeof id !== 'string' || typeof data !== 'string') throw new Error('Invalid terminal input');
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const running = runningProcesses.get(owner)?.get(id);
    if (running?.stdin && running.stdin.writable && !running.stdin.destroyed) {
      // xterm emits carriage return for Enter; piped programs need a newline
      // so getline/scanf/cin do not wait forever for the line terminator.
      if (data.includes('\u0003')) {
        try { running.kill(); } catch { /* it may have exited already */ }
        const interrupt = data.replace(/[^\u0003]/g, '');
        if (interrupt) {
          owner.webContents.send(IPC.TERMINAL.DATA, { id, data: '^C\r\n' } satisfies TerminalDataPayload);
        }
      } else if (data.includes('\u0004') || data.includes('\u001a')) {
        try { running.stdin.end(); } catch { /* process exited between the checks */ }
      } else {
        const input = data.replace(/\r/g, '\n');
        // A child connected through a pipe has no console driver to echo input.
        // Echo ordinary typing so prompts remain usable; leave escape sequences
        // to the program instead of drawing them into xterm.
        if (!/\u001b/.test(data)) {
          const echoed = data.replace(/\r/g, '\r\n').replace(/\u007f/g, '\b \b');
          if (echoed) owner.webContents.send(IPC.TERMINAL.DATA, { id, data: echoed } satisfies TerminalDataPayload);
        }
        try { running.stdin.write(input); } catch { /* process exited between the checks */ }
      }
      return;
    }
    const term = (terminalSets.get(owner) || terminals).get(id);
    if (!term) throw new Error('Terminal not found');
    term.write(data);
  });

  ipcMain.handle(IPC.TERMINAL.RESIZE, async (event, id: string, cols: number, rows: number) => {
    const term = (terminalSets.get(BrowserWindow.fromWebContents(event.sender) || win) || terminals).get(id);
    if (term) {
      const safeCols = Number.isFinite(cols) ? Math.max(2, Math.floor(cols)) : 80;
      const safeRows = Number.isFinite(rows) ? Math.max(1, Math.floor(rows)) : 24;
      term.resize(safeCols, safeRows);
    } else throw new Error('Terminal not found');
  });

  ipcMain.handle(IPC.TERMINAL.KILL, async (event, id: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const ownedTerminals = terminalSets.get(owner) || terminals;
    const running = runningProcesses.get(owner)?.get(id);
    if (running) {
      await stopChildProcess(running);
      if (runningProcesses.get(owner)?.get(id) === running) runningProcesses.get(owner)?.delete(id);
    }
    const term = ownedTerminals.get(id);
    if (term) {
      term.kill();
      ownedTerminals.delete(id);
    } else throw new Error('Terminal not found');
  });

  ipcMain.handle(IPC.TERMINAL.RUN, async (event, id: string, filePath: string, language: string) => {
    const owner = BrowserWindow.fromWebContents(event.sender) || win;
    const term = (terminalSets.get(owner) || terminals).get(id);
    const root = workspaceRoots.get(owner);
    if (!term || typeof filePath !== 'string' || !path.isAbsolute(filePath) || !root || !withinRoot(root, filePath) || typeof language !== 'string' || !language.trim()) throw new Error('Invalid terminal run request');
    const sourceStat = await fs.promises.stat(filePath).catch(() => null);
    if (!sourceStat?.isFile()) throw new Error('Source file not found');
    const sourceText = await fs.promises.readFile(filePath, 'utf8').catch(() => '');

    const roots = [
      // Packaged app: compilers are unpacked next to app.asar so the OS can execute them
      path.join(process.resourcesPath, 'app.asar.unpacked', 'compilers'),
      path.join(process.resourcesPath, 'compilers'),
      path.resolve(__dirname, '../../compilers'),
      path.resolve(process.cwd(), 'compilers')
    ];

    const bundled = (relative: string) => {
      for (const root of roots) {
        const fullPath = path.join(root, relative);
        if (fs.existsSync(fullPath)) return fullPath;
      }
      return null;
    };

    const python = bundled(path.join('python', 'python.exe')) || 'python';
    const node = bundled(path.join('node', 'node.exe')) || 'node';
    const gxx = bundled(path.join('mingw', 'bin', 'g++.exe')) || 'g++';
    const gcc = bundled(path.join('mingw', 'bin', 'gcc.exe')) || 'gcc';
    const rscript = bundled(path.join('r', 'bin', 'x64', 'Rscript.exe'))
      || bundled(path.join('r', 'bin', 'Rscript.exe'))
      || 'Rscript';

    // Bundled runtimes may depend on DLLs beside their executables. Keep those
    // directories available to both the compiler and the program it produces.
    const runtimeDirectories = [python, node, gxx, gcc, rscript]
      .filter((executable) => path.isAbsolute(executable))
      .map((executable) => path.dirname(executable));
    const processEnv: NodeJS.ProcessEnv = { ...process.env };
    // Keep the compiler's own bin directory first so a system gcc/ld cannot
    // accidentally be mixed with the bundled MinGW runtime.
    const pathKey = Object.keys(processEnv).find((key) => key.toLowerCase() === 'path') || 'PATH';
    const existingPath = processEnv[pathKey] || '';
    processEnv[pathKey] = [...new Set([...runtimeDirectories, ...existingPath.split(path.delimiter).filter(Boolean)])].join(path.delimiter);

    const requestedLanguage = language.toLowerCase().replace(/^\./, '');
    const sourceExtension = path.extname(filePath).toLowerCase();
    const looksLikeCpp = /#\s*include\s*[<"](?:iostream|string|vector|map|set|algorithm)[>"]/.test(sourceText)
      || /\b(?:std::)?(?:cin|cout|cerr|clog|endl)\b/.test(sourceText);
    const ext = ['.cpp', '.cc', '.cxx', '.c++'].includes(sourceExtension) || looksLikeCpp
      ? 'cpp'
      : sourceExtension === '.c'
        ? 'c'
        : requestedLanguage;
    const dir = path.dirname(filePath);
    const basename = path.basename(filePath, path.extname(filePath));
    const output = path.join(dir, `${basename}${process.platform === 'win32' ? '.exe' : ''}`);
    const processes = runningProcesses.get(owner) || new Map<string, ChildProcess>();
    runningProcesses.set(owner, processes);
    const byOutput = outputProcesses.get(owner) || new Map<string, ChildProcess>();
    outputProcesses.set(owner, byOutput);
    // A second Run click should stop the previous program before the linker
    // tries to replace its executable. Windows otherwise reports a misleading
    // `collect2.exe: error: ld returned 1 exit status` when the file is locked.
    // Stop both the process tracked for this terminal and any process holding
    // this output path (e.g. a run started from a different terminal).
    const previousProcess = processes.get(id);
    if (previousProcess) {
      await stopChildProcess(previousProcess);
      if (processes.get(id) === previousProcess) processes.delete(id);
    }
    const outputHolder = byOutput.get(output);
    if (outputHolder) {
      await stopChildProcess(outputHolder);
      if (byOutput.get(output) === outputHolder) byOutput.delete(output);
    }
    const sendProcessOutput = (data: unknown) => {
      if (owner.isDestroyed() || owner.webContents.isDestroyed()) return;
      const payload: TerminalDataPayload = { id, data: String(data) };
      owner.webContents.send(IPC.TERMINAL.DATA, payload);
    };
    const sendCompilerOutput = (data: unknown) => {
      const text = String(data).replace(/\r\n/g, '\n').replace(/\r/g, '').replace(/\n/g, '\r\n');
      sendProcessOutput(text);
    };
    const displayArg = (value: string) => /\s/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
    // Retains recent child output so a locked-exe link failure can be detected.
    let lastOutputText = '';
    const runProcess = (executable: string, args: string[]): Promise<number> => new Promise((resolve, reject) => {
      sendProcessOutput(`\r\n> ${[executable, ...args].map(displayArg).join(' ')}\r\n`);
      let child: ChildProcess;
      try {
        child = spawn(executable, args, {
          cwd: dir,
          env: processEnv,
          shell: false,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      }
      catch (error) { reject(error); return; }
      processes.set(id, child);
      if (executable === output) byOutput.set(output, child);
      let settled = false;
      const cleanup = () => {
        if (processes.get(id) === child) processes.delete(id);
        if (executable === output && byOutput.get(output) === child) byOutput.delete(output);
      };
      child.stdin?.on('error', () => { /* input can race with process exit */ });
      child.stdout?.on('data', (data) => { sendCompilerOutput(data); lastOutputText += String(data); });
      child.stderr?.on('data', (data) => { sendCompilerOutput(data); lastOutputText += String(data); });
      child.once('error', (error) => {
        if (settled) return;
        settled = true;
        cleanup();
        sendProcessOutput(`${error instanceof Error ? error.message : String(error)}\r\n`);
        reject(error);
      });
      child.once('close', (code) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(code ?? 1);
      });
    });
    // The linker cannot replace the output executable while another process
    // (or an antivirus scan) holds it; unlock it first, then retry once if
    // the link still fails with a lock-shaped error.
    const compile = async (compiler: string, args: string[]): Promise<number> => {
      await ensureOutputWritable(output);
      lastOutputText = '';
      let exitCode = await runProcess(compiler, args);
      if (exitCode !== 0 && /cannot open output file|permission denied/i.test(lastOutputText)) {
        sendProcessOutput('\r\n[Output executable was locked; retrying once...]\r\n');
        await new Promise((resolve) => setTimeout(resolve, 500));
        lastOutputText = '';
        exitCode = await runProcess(compiler, args);
        if (exitCode !== 0) {
          sendProcessOutput(`\r\n[Still failing: close any running instance of ${path.basename(output)} or check your antivirus.]\r\n`);
        }
      }
      return exitCode;
    };
    let code: number;
    if (['cpp', 'cc', 'cxx', 'c++'].includes(ext)) {
      code = await compile(gxx, ['-std=gnu++17', '-mconsole', '-o', output, filePath]);
      if (code !== 0) sendProcessOutput('\r\n[Compilation failed; see the linker/compiler messages above.]\r\n');
      if (code === 0) await runProcess(output, []);
    } else if (ext === 'c') {
      code = await compile(gcc, ['-std=gnu11', '-mconsole', '-o', output, filePath]);
      if (code !== 0) sendProcessOutput('\r\n[Compilation failed; see the linker/compiler messages above.]\r\n');
      if (code === 0) await runProcess(output, []);
    } else if (ext === 'python' || ext === 'py') await runProcess(python, [filePath]);
    else if (ext === 'javascript' || ext === 'js') await runProcess(node, [filePath]);
    else if (ext === 'r') await runProcess(rscript, [filePath]);
    else throw new Error(`No runner configured for ${language}`);
  });

  // Ensure child shells do not survive a renderer/window close.
  win.once('closed', () => {
    for (const child of runningProcesses.get(win)?.values() || []) { try { child.kill(); } catch { /* already exited */ } }
    runningProcesses.get(win)?.clear();
    outputProcesses.get(win)?.clear();
    for (const [id, term] of terminals) {
      try { term.kill(); } catch { /* process may already have exited */ }
      terminals.delete(id);
    }
  });
}

function withinRoot(root: string, candidate: string): boolean {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function stopChildProcess(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    let timer: NodeJS.Timeout | undefined;
    const finish = () => {
      if (timer) clearTimeout(timer);
      child.removeListener('close', finish);
      child.removeListener('error', finish);
      resolve();
    };
    child.once('close', finish);
    child.once('error', finish);
    try { child.kill(); } catch { finish(); return; }
    timer = setTimeout(finish, 2000);
  });
}

function killByImageName(imageName: string): Promise<void> {
  if (process.platform !== 'win32') return Promise.resolve();
  return new Promise((resolve) => {
    const killer = spawn('taskkill', ['/IM', imageName, '/F', '/T'], { windowsHide: true, stdio: 'ignore' });
    killer.once('close', () => resolve());
    killer.once('error', () => resolve());
  });
}

async function ensureOutputWritable(output: string): Promise<void> {
  try {
    await fs.promises.rm(output, { force: true });
    return;
  } catch {
    if (process.platform !== 'win32') throw new Error(`Cannot replace "${path.basename(output)}".`);
  }
  // The executable is locked, most likely by a leftover instance from an
  // earlier run. Kill it and try once more so the user gets a real
  // explanation instead of the linker's cryptic `ld returned 1 exit status`.
  await killByImageName(path.basename(output));
  await new Promise((resolve) => setTimeout(resolve, 300));
  try {
    await fs.promises.rm(output, { force: true });
  } catch {
    throw new Error(`Cannot replace "${path.basename(output)}": it is locked by a running process or antivirus. Close any running instance and try again.`);
  }
}

export function setTerminalWorkspaceRoot(root: string, win: BrowserWindowType) {
  workspaceRoots.set(win, path.resolve(root));
}
