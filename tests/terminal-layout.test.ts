import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/renderer/components/editor/editor-manager', () => ({ EditorManager: class {} }));

import { createLayout } from '../src/renderer/components/layout';

describe('terminal layout contract', () => {
  it('starts with the terminal panel hidden and exposes the editor toggle', () => {
    const app = document.createElement('div');
    const editorManager = { setContainers: vi.fn(), layoutAll: vi.fn() } as never;
    createLayout(app, editorManager);

    expect(app.querySelector('#editor-terminal-toggle')).not.toBeNull();
    expect(app.querySelector('#bottom-panel')?.classList.contains('hidden')).toBe(true);
  });

  it('toggles the terminal panel from the editor button and Ctrl+`', () => {
    const app = document.createElement('div');
    const editorManager = { setContainers: vi.fn(), layoutAll: vi.fn() } as never;
    createLayout(app, editorManager);
    const toggle = app.querySelector('#editor-terminal-toggle') as HTMLButtonElement;
    const panel = app.querySelector('#bottom-panel') as HTMLElement;

    toggle.click();
    expect(panel.classList.contains('hidden')).toBe(false);
    toggle.click();
    expect(panel.classList.contains('hidden')).toBe(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '`', ctrlKey: true }));
    expect(panel.classList.contains('hidden')).toBe(false);
  });

  it('exposes a plus creator and right-side session list without a global kill button', () => {
    const app = document.createElement('div');
    const editorManager = { setContainers: vi.fn(), layoutAll: vi.fn() } as never;
    createLayout(app, editorManager);

    const newButton = app.querySelector('#terminal-new');
    expect(newButton?.textContent).toBe('+');
    expect(app.querySelector('#terminal-kill')).toBeNull();
    expect(app.querySelector('#terminal-session-list')).not.toBeNull();
  });
});
