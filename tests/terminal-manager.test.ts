import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  MockTerminal: class {
    cols = 80;
    rows = 24;
    inputListener: ((data: string) => void) | undefined;
    writes: string[] = [];
    disposed = false;
    focused = false;
    loadAddon() { /* addon is intentionally inert in the unit test */ }
    open() { /* DOM attachment is managed by TerminalManager */ }
    onData(listener: (data: string) => void) { this.inputListener = listener; return { dispose: vi.fn() }; }
    write(data: string) { this.writes.push(data); }
    writeln(data: string) { this.writes.push(`${data}\n`); }
    focus() { this.focused = true; }
    clear() { this.writes = []; }
    dispose() { this.disposed = true; }
  },
  terminals: [] as Array<{ writes: string[]; inputListener?: (data: string) => void; disposed?: boolean }>,
  observers: [] as Array<{ disconnected: boolean }>,
  create: vi.fn(),
  write: vi.fn(),
  resize: vi.fn(),
  kill: vi.fn(),
  run: vi.fn(),
  dataListener: undefined as ((payload: { id: string; data: string }) => void) | undefined,
  exitListener: undefined as ((payload: { id: string; exitCode: number }) => void) | undefined,
}));

vi.mock('@xterm/xterm', () => ({ Terminal: class extends mocks.MockTerminal {
  constructor() { super(); mocks.terminals.push(this); }
} }));
vi.mock('@xterm/addon-fit', () => ({ FitAddon: class { fit() {} } }));
vi.mock('@xterm/addon-web-links', () => ({ WebLinksAddon: class {} }));
vi.mock('@xterm/xterm/css/xterm.css', () => ({}));

import { TerminalManager } from '../src/renderer/components/terminal/terminal';

function makeApi() {
  return {
    terminal: {
      create: mocks.create,
      write: mocks.write,
      resize: mocks.resize,
      kill: mocks.kill,
      run: mocks.run,
      onData: vi.fn((listener: (payload: { id: string; data: string }) => void) => {
        mocks.dataListener = listener;
        return () => { mocks.dataListener = undefined; };
      }),
      onExited: vi.fn((listener: (payload: { id: string; exitCode: number }) => void) => {
        mocks.exitListener = listener;
        return () => { mocks.exitListener = undefined; };
      }),
    },
  };
}

describe('TerminalManager multi-session behavior', () => {
  beforeEach(() => {
    mocks.terminals.length = 0;
    mocks.observers.length = 0;
    mocks.create.mockReset();
    mocks.write.mockReset();
    mocks.resize.mockReset();
    mocks.kill.mockReset();
    mocks.run.mockReset();
    mocks.create.mockImplementationOnce(async () => 'term-1').mockImplementationOnce(async () => 'term-2');
    mocks.dataListener = undefined;
    mocks.exitListener = undefined;
    vi.stubGlobal('confirm', vi.fn(() => true));
    Object.defineProperty(globalThis, 'window', { value: { api: makeApi() }, configurable: true });
    class TestResizeObserver {
      disconnected = false;
      constructor() { mocks.observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    }
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
  });

  it('does not create a terminal until explicitly requested', () => {
    const manager = new TerminalManager();
    manager.setContainer(document.createElement('div'), document.createElement('div'));
    manager.init();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('creates independent sessions and activates the newest one', async () => {
    const container = document.createElement('div');
    const list = document.createElement('div');
    const manager = new TerminalManager();
    manager.setContainer(container, list);
    manager.init();

    await manager.newTerminal();
    await manager.newTerminal();

    expect(mocks.create).toHaveBeenCalledTimes(2);
    expect(list.querySelectorAll('.terminal-session-item')).toHaveLength(2);
    expect(container.querySelectorAll('.terminal-session-view.active')).toHaveLength(1);
    expect(list.querySelectorAll('.terminal-session-item.active')).toHaveLength(1);
    expect(list.querySelectorAll('.terminal-session-item.active')[0]).toBe(list.lastElementChild);
    (list.firstElementChild as HTMLElement).click();
    await manager.run('C:\\workspace\\first.py', 'python');
    expect(mocks.run).toHaveBeenCalledWith('term-1', 'C:\\workspace\\first.py', 'python');
  });

  it('does not create duplicate sessions while creation is pending', async () => {
    let resolveCreate: (id: string) => void = () => undefined;
    mocks.create.mockReset();
    mocks.create.mockImplementation(() => new Promise<string>((resolve) => { resolveCreate = resolve; }));
    const manager = new TerminalManager();
    manager.setContainer(document.createElement('div'), document.createElement('div'));
    manager.init();
    const first = manager.newTerminal();
    const second = manager.newTerminal();
    expect(mocks.create).toHaveBeenCalledTimes(1);
    resolveCreate('term-pending');
    await expect(first).resolves.toBe('term-pending');
    await expect(second).resolves.toBeNull();
  });

  it('routes data only to the matching terminal session', async () => {
    const container = document.createElement('div');
    const list = document.createElement('div');
    const manager = new TerminalManager();
    manager.setContainer(container, list);
    manager.init();
    await manager.newTerminal();
    await manager.newTerminal();

    mocks.dataListener?.({ id: 'term-1', data: 'first' });
    mocks.dataListener?.({ id: 'term-2', data: 'second' });
    expect(mocks.terminals[0].writes).toContain('first');
    expect(mocks.terminals[0].writes).not.toContain('second');
    expect(mocks.terminals[1].writes).toContain('second');
    mocks.terminals[0].inputListener?.('input-one');
    expect(mocks.write).toHaveBeenCalledWith('term-1', 'input-one');
    mocks.dataListener?.({ id: 'unknown', data: 'ignored' });
    expect(mocks.terminals[0].writes).not.toContain('ignored');
  });

  it('requires confirmation before killing a session', async () => {
    const list = document.createElement('div');
    const manager = new TerminalManager();
    manager.setContainer(document.createElement('div'), list);
    manager.init();
    await manager.newTerminal();

    vi.mocked(confirm).mockReturnValueOnce(false);
    (list.querySelector('.terminal-session-kill') as HTMLButtonElement).click();
    expect(mocks.kill).not.toHaveBeenCalled();
    expect(list.querySelector('.terminal-session-item')).not.toBeNull();

    vi.mocked(confirm).mockReturnValueOnce(true);
    (list.querySelector('.terminal-session-kill') as HTMLButtonElement).click();
    expect(mocks.kill).toHaveBeenCalledWith('term-1');
    expect(list.querySelector('.terminal-session-item')).toBeNull();
    expect(mocks.terminals[0].disposed).toBe(true);
    expect(mocks.observers[0].disconnected).toBe(true);
  });

  it('activates another session when the active session is terminated', async () => {
    const container = document.createElement('div');
    const list = document.createElement('div');
    const manager = new TerminalManager();
    manager.setContainer(container, list);
    manager.init();
    await manager.newTerminal();
    await manager.newTerminal();
    (list.lastElementChild?.querySelector('.terminal-session-kill') as HTMLButtonElement).click();
    expect(list.querySelectorAll('.terminal-session-item')).toHaveLength(1);
    expect(list.querySelector('.terminal-session-item.active')).toBe(list.firstElementChild);
    expect(container.querySelector('.terminal-session-view.active')).toBe(container.firstElementChild);
  });

  it('marks the matching session when its PTY exits', async () => {
    const list = document.createElement('div');
    const manager = new TerminalManager();
    manager.setContainer(document.createElement('div'), list);
    manager.init();
    await manager.newTerminal();
    await manager.newTerminal();
    mocks.exitListener?.({ id: 'term-1', exitCode: 0 });
    expect(list.querySelectorAll('.terminal-session-item.exited')).toHaveLength(1);
    expect(list.lastElementChild?.classList.contains('exited')).toBe(false);
    expect(mocks.terminals[0].writes.join('')).toContain('Process exited with code 0');
    mocks.exitListener?.({ id: 'unknown', exitCode: 1 });
    expect(list.querySelectorAll('.terminal-session-item.exited')).toHaveLength(1);
  });

  it('creates a session automatically when run is requested without an active session', async () => {
    const manager = new TerminalManager();
    manager.setContainer(document.createElement('div'), document.createElement('div'));
    manager.init();
    await manager.run('C:\\workspace\\main.py', 'python');
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(mocks.run).toHaveBeenCalledWith('term-1', 'C:\\workspace\\main.py', 'python');
  });

  it('runs code in the active session and kills every session on dispose', async () => {
    const manager = new TerminalManager();
    manager.setContainer(document.createElement('div'), document.createElement('div'));
    manager.init();
    await manager.newTerminal();
    await manager.newTerminal();
    await manager.run('C:\\workspace\\main.py', 'python');
    expect(mocks.run).toHaveBeenCalledWith('term-2', 'C:\\workspace\\main.py', 'python');
    manager.dispose();
    expect(mocks.kill).toHaveBeenCalledWith('term-1');
    expect(mocks.kill).toHaveBeenCalledWith('term-2');
    expect(mocks.terminals[0].disposed).toBe(true);
    expect(mocks.terminals[1].disposed).toBe(true);
    expect(mocks.observers.every((observer) => observer.disconnected)).toBe(true);
    manager.dispose();
    expect(mocks.kill).toHaveBeenCalledTimes(2);
  });
});
