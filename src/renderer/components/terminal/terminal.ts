import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { t } from '../../i18n';

interface TerminalSession {
  id: string;
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLElement;
  item: HTMLElement;
  resizeObserver: ResizeObserver;
  exited: boolean;
}

export class TerminalManager {
  private container: HTMLElement | null = null;
  private sessionList: HTMLElement | null = null;
  private sessions = new Map<string, TerminalSession>();
  private activeId: string | null = null;
  private unsubscribers: Array<() => void> = [];
  private initialized = false;
  private creating = false;

  setContainer(container: HTMLElement, sessionList?: HTMLElement) {
    this.container = container;
    this.sessionList = sessionList || null;
  }

  init() {
    if (this.initialized || !this.container || !window.api?.terminal) return;
    this.initialized = true;
    this.unsubscribers.push(window.api.terminal.onData((payload) => {
      this.sessions.get(payload.id)?.terminal.write(payload.data);
    }));
    this.unsubscribers.push(window.api.terminal.onExited((payload) => {
      const session = this.sessions.get(payload.id);
      if (!session) return;
      session.terminal.writeln(`\r\n${t('processExited', { code: payload.exitCode })}`);
      session.exited = true;
      this.updateSessionItem(session, false);
    }));
  }

  async newTerminal(): Promise<string | null> {
    if (!this.container || !window.api?.terminal || this.creating) return null;
    this.creating = true;
    let terminal: Terminal | null = null;
    try {
      terminal = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
        theme: { background: '#1e1e1e', foreground: '#cccccc', cursor: '#cccccc' },
        scrollback: 1000,
      });
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddon());
      const container = document.createElement('div');
      container.className = 'terminal-session-view';
      this.container.appendChild(container);
      terminal.open(container);
      fitAddon.fit();
      const createdTerminal = terminal;
      const id = await window.api.terminal.create(terminal.cols, terminal.rows);
      const item = document.createElement('div');
      item.className = 'terminal-session-item';
      item.setAttribute('role', 'tab');
      item.tabIndex = 0;
      const label = document.createElement('span');
      label.className = 'terminal-session-name';
      label.textContent = 'powershell';
      const kill = document.createElement('button');
      kill.className = 'terminal-session-kill';
      kill.type = 'button';
      kill.title = t('terminateTerminal');
      kill.setAttribute('aria-label', t('terminateTerminal'));
      kill.textContent = '🗑';
      item.append(label, kill);
      this.sessionList?.appendChild(item);
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        // Wait a tick for fit() to update cols/rows before sending to PTY
        queueMicrotask(() => {
          void window.api.terminal.resize(id, createdTerminal.cols, createdTerminal.rows);
        });
      });
      resizeObserver.observe(container);
      const session: TerminalSession = { id, terminal: createdTerminal, fitAddon, container, item, resizeObserver, exited: false };
      this.sessions.set(id, session);
      createdTerminal.onData((data) => void window.api.terminal.write(id, data));
      item.addEventListener('click', () => this.activate(id));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.activate(id); }
      });
      kill.addEventListener('click', (event) => { event.stopPropagation(); void this.confirmKill(id); });
      this.activate(id);
      return id;
    } catch (error) {
      terminal?.dispose();
      this.container?.querySelector('.terminal-session-view:last-child')?.remove();
      throw error;
    } finally {
      this.creating = false;
    }
  }

  private activate(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    this.activeId = id;
    for (const current of this.sessions.values()) {
      const active = current.id === id;
      current.container.classList.toggle('active', active);
      current.item.classList.toggle('active', active);
      current.item.setAttribute('aria-selected', String(active));
    }
    session.fitAddon.fit();
    session.terminal.focus();
  }

  private updateSessionItem(session: TerminalSession, running: boolean) {
    session.item.classList.toggle('exited', !running);
  }

  getSessionCount(): number { return this.sessions.size; }

  private async confirmKill(id: string) {
    if (!confirm(t('terminateTerminalConfirm'))) return;
    this.kill(id);
  }

  kill(id = this.activeId) {
    if (!id) return;
    const session = this.sessions.get(id);
    if (!session) return;
    if (!session.exited) void window.api.terminal.kill(id);
    session.resizeObserver.disconnect();
    session.terminal.dispose();
    session.container.remove();
    session.item.remove();
    this.sessions.delete(id);
    if (this.activeId === id) {
      const next = this.sessions.keys().next().value as string | undefined;
      this.activeId = null;
      if (next) this.activate(next);
    }
  }

  clear() { if (this.activeId) this.sessions.get(this.activeId)?.terminal.clear(); }

  async run(filePath: string, language: string) {
    if (!this.activeId || this.sessions.get(this.activeId)?.exited) await this.newTerminal();
    if (this.activeId) await window.api.terminal.run(this.activeId, filePath, language);
  }

  dispose() {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.unsubscribers = [];
    for (const id of [...this.sessions.keys()]) this.killWithoutPrompt(id);
    this.sessions.clear();
    this.activeId = null;
    this.initialized = false;
  }

  private killWithoutPrompt(id: string) {
    const session = this.sessions.get(id);
    if (!session) return;
    void window.api.terminal.kill(id);
    session.resizeObserver.disconnect();
    session.terminal.dispose();
    session.container.remove();
    session.item.remove();
  }
}
