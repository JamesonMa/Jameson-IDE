import * as monaco from 'monaco-editor';
import { MarkdownPreview } from '../markdown-preview';
import { t } from '../../i18n';

interface EditorTab {
  filePath: string;
  fileName: string;
  editor: monaco.editor.IStandaloneCodeEditor;
  model: monaco.editor.ITextModel;
  tabEl: HTMLElement;
  container: HTMLElement;
  dirty: boolean;
  isMarkdown: boolean;
  saving?: boolean;
  observer?: ResizeObserver;
  wheelListener?: (e: WheelEvent) => void;
  domNode?: HTMLElement;
}

export class EditorManager {
  private tabBar: HTMLElement | null = null;
  private editorContainer: HTMLElement | null = null;
  private tabs: Map<string, EditorTab> = new Map();
  private activeTab: string | null = null;
  private mdPreview: MarkdownPreview;
  private opening = new Set<string>();

  constructor() {
    this.mdPreview = new MarkdownPreview();

    // Global Ctrl+S handler for saving active file
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const activeFile = this.getActiveFilePath();
        if (activeFile) void this.saveFile(activeFile);
      }
    });
  }

  getActiveFilePath(): string | null {
    return this.activeTab;
  }

  getActiveEditor(): monaco.editor.IStandaloneCodeEditor | null {
    if (!this.activeTab) return null;
    return this.tabs.get(this.activeTab)?.editor || null;
  }

  getActiveLanguage(): string | null {
    if (!this.activeTab) return null;
    const tab = this.tabs.get(this.activeTab);
    if (!tab) return null;
    return this.detectLanguage(tab.fileName);
  }

  setContainers(tabBar: HTMLElement, editorContainer: HTMLElement) {
    this.tabBar = tabBar;
    this.editorContainer = editorContainer;

    // Append markdown preview to body
    document.body.appendChild(this.mdPreview.getContainer());
  }

  async openFile(filePath: string, fileName?: string) {
    if (this.tabs.has(filePath)) {
      this.activateTab(filePath);
      return;
    }
    if (this.opening.has(filePath)) return;
    if (!this.tabBar || !this.editorContainer) {
      console.error('Editor containers not initialized');
      return;
    }

    // Check if running in web context without Electron API
    if (!window.api?.file?.read) {
      console.error('window.api.file.read is not available - running in unsupported web context');
      return;
    }
    this.opening.add(filePath);

    // Hide welcome
    const welcome = document.getElementById('editor-welcome');
    if (welcome) welcome.style.display = 'none';

    try {
      const result = await window.api.file.read(filePath);
      const name = fileName || filePath.split(/[\\/]/).pop() || 'untitled';
      const language = this.detectLanguage(name);
      const isMarkdown = language === 'markdown';

      // Create tab element first
      const tabEl = document.createElement('div');
      tabEl.className = 'tab';
      tabEl.setAttribute('role', 'tab');
      tabEl.tabIndex = 0;
      tabEl.setAttribute('aria-label', name);
      tabEl.setAttribute('aria-selected', 'false');
      const tabName = document.createElement('span');
      tabName.className = 'tab-name';
      tabName.textContent = name;
      tabEl.appendChild(tabName);
      if (isMarkdown) {
        const preview = document.createElement('button');
        preview.className = 'tab-preview';
        preview.title = 'Toggle Preview';
        preview.setAttribute('aria-label', `Preview ${name}`);
        preview.textContent = '👁';
        tabEl.appendChild(preview);
      }
      const close = document.createElement('button');
      close.className = 'tab-close';
      close.title = `Close ${name}`;
      close.setAttribute('aria-label', `Close ${name}`);
      close.textContent = '×';
      tabEl.appendChild(close);

      // Create editor container
      const container = document.createElement('div');
      container.className = 'editor-instance';
      container.style.width = '100%';
      container.style.height = '100%';

      // Ensure editorContainer is still valid before appendChild
      if (!this.editorContainer) {
        console.error('editorContainer became null during openFile');
        return;
      }
      this.editorContainer.appendChild(container);

      // Wait for container to be in DOM before creating Monaco editor
      // This prevents "Cannot read properties of null (reading 'appendChild')" error
      await new Promise(resolve => requestAnimationFrame(resolve));

      // Create Monaco model and editor
      const uri = monaco.Uri.file(filePath);
      let model = monaco.editor.getModel(uri);
      if (!model) {
        model = monaco.editor.createModel(result.content, language, uri);
      }

      // Create tab object early so it can be referenced in callbacks
      const tab: EditorTab = {
        filePath,
        fileName: name,
        editor: null as any,
        model,
        tabEl,
        container,
        dirty: false,
        isMarkdown
      };

      const editor = monaco.editor.create(container, {
        model,
        theme: 'vs-dark',
        automaticLayout: false,
        minimap: { enabled: true },
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        wordWrap: 'off',
        tabSize: 4,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        smoothScrolling: true,
        cursorSmoothCaretAnimation: 'on',
      });

      // Update tab with editor reference
      tab.editor = editor;

      // ResizeObserver for auto layout
      const observer = new ResizeObserver(() => {
        const focusedEl = document.activeElement;
        const isInputFocused = focusedEl instanceof HTMLInputElement ||
                               focusedEl instanceof HTMLTextAreaElement;

        editor.layout();

        // Restore focus if layout stole it from an input
        if (isInputFocused && document.activeElement !== focusedEl) {
          (focusedEl as HTMLElement).focus();
        }
      });
      observer.observe(container);
      tab.observer = observer;

      // Track dirty state
      model.onDidChangeContent(() => {
        tab.dirty = true;
        tabEl.classList.add('modified');

        // Update markdown preview if visible
        if (tab.isMarkdown && this.mdPreview.isVisible() && this.mdPreview.getCurrentFile() === filePath) {
          this.mdPreview.update(model.getValue());
        }
      });

      // Update status bar on cursor change
      editor.onDidChangeCursorPosition((e) => {
        const pos = e.position;
        const posEl = document.getElementById('status-position');
        if (posEl) posEl.textContent = t('lineCol', { line: pos.lineNumber, col: pos.column });
        const langEl = document.getElementById('status-language');
        if (langEl) langEl.textContent = language;
      });

      // Ctrl+MouseWheel zoom
      const domNode = editor.getDomNode();
      if (domNode) {
        const wheelListener = (e: WheelEvent) => {
          if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -1 : 1;
            const currentSize = editor.getOption(monaco.editor.EditorOption.fontSize);
            const newSize = Math.max(8, Math.min(32, currentSize + delta));
            editor.updateOptions({ fontSize: newSize });
          }
        };
        domNode.addEventListener('wheel', wheelListener, { passive: false });
        tab.wheelListener = wheelListener;
        tab.domNode = domNode;
      }

      tabEl.querySelector('.tab-close')!.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeFile(filePath);
      });

      // Wire preview button for markdown
      if (isMarkdown) {
        tabEl.querySelector('.tab-preview')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.mdPreview.isVisible() && this.mdPreview.getCurrentFile() === filePath) {
            this.mdPreview.hide();
          } else {
            this.mdPreview.show(filePath, model.getValue());
          }
        });
      }

      tabEl.addEventListener('click', () => {
        this.activateTab(filePath);
      });
      tabEl.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.activateTab(filePath);
        }
      });

      // Ensure tabBar is still valid before appendChild
      if (!this.tabBar) {
        console.error('tabBar became null during openFile');
        editor.dispose();
        container.remove();
        return;
      }
      const terminalToggle = this.tabBar.querySelector('#editor-terminal-toggle');
      if (terminalToggle) this.tabBar.insertBefore(tabEl, terminalToggle);
      else this.tabBar.appendChild(tabEl);

      this.tabs.set(filePath, tab);
      this.activateTab(filePath);
    } catch (err) {
      console.error('Failed to open file:', err);
      alert(t('unableToOpenFile', { error: err instanceof Error ? err.message : String(err) }));
    } finally {
      this.opening.delete(filePath);
    }
  }

  async openFileAt(filePath: string, line: number, column = 1) {
    await this.openFile(filePath);
    const editor = this.getActiveEditor();
    if (!editor) return;
    const position = {
      lineNumber: Math.max(1, line),
      column: Math.max(1, column),
    };
    editor.setPosition(position);
    editor.revealLineInCenter(position.lineNumber);

    // Only focus if not stealing from an input
    const activeEl = document.activeElement;
    const isInputFocused = activeEl instanceof HTMLInputElement ||
                           activeEl instanceof HTMLTextAreaElement;
    if (!isInputFocused) {
      editor.focus();
    }
  }

  activateTab(filePath: string) {
    const tab = this.tabs.get(filePath);
    if (!tab || !this.tabBar || !this.editorContainer) return;

    // Deactivate all
    for (const [, t] of this.tabs) {
      t.container.classList.remove('active');
      t.tabEl.classList.remove('active');
      t.tabEl.setAttribute('aria-selected', 'false');
    }

    // Activate this
    tab.container.classList.add('active');
    tab.tabEl.classList.add('active');
    tab.tabEl.setAttribute('aria-selected', 'true');
    tab.editor.layout();

    // Only focus if the active element is not an input field
    const activeEl = document.activeElement;
    const isInputFocused = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
    console.log('activateTab called, activeElement:', activeEl?.tagName, 'isInput:', isInputFocused);
    if (!isInputFocused) {
      tab.editor.focus();
    }
    this.activeTab = filePath;

    // Update status bar
    const pos = tab.editor.getPosition();
    if (pos) {
      const posEl = document.getElementById('status-position');
      if (posEl) posEl.textContent = t('lineCol', { line: pos.lineNumber, col: pos.column });
    }
    const langEl = document.getElementById('status-language');
    if (langEl) langEl.textContent = this.detectLanguage(tab.fileName);

    // Scroll tab into view
    tab.tabEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }

  async saveFile(filePath: string): Promise<boolean> {
    const tab = this.tabs.get(filePath);
    if (!tab) return false;

    // Prevent duplicate saves if already saving
    if (tab.saving) {
      console.log('Save already in progress for:', filePath);
      return false;
    }

    tab.saving = true;
    try {
      await window.api.file.write(filePath, tab.model.getValue());
      tab.dirty = false;
      tab.tabEl.classList.remove('modified');

      // Visual feedback - flash the tab name briefly
      const tabName = tab.tabEl.querySelector('.tab-name');
      if (tabName) {
        const original = tabName.textContent;
        tabName.textContent = `${original} ${t('saved')}`;
        setTimeout(() => {
          tabName.textContent = original;
        }, 1000);
      }

      console.log('File saved:', filePath);
      return true;
    } catch (err) {
      console.error('Failed to save file:', err);
      alert(t('unableToSaveFile', { error: err instanceof Error ? err.message : String(err) }));
      return false;
    } finally {
      tab.saving = false;
    }
  }

  async closeFile(filePath: string, force = false) {
    const tab = this.tabs.get(filePath);
    if (!tab) return;
    if (tab.dirty && !force) {
      const save = confirm(t('saveBeforeClose', { name: tab.fileName }));
      if (save && !(await this.saveFile(filePath))) return;
      if (!save && !confirm(t('discardChanges', { name: tab.fileName }))) return;
    }

    tab.observer?.disconnect();
    if (tab.wheelListener && tab.domNode) {
      tab.domNode.removeEventListener('wheel', tab.wheelListener);
    }
    tab.editor.dispose();
    tab.model.dispose();
    tab.container.remove();
    tab.tabEl.remove();
    this.tabs.delete(filePath);

    // Activate another tab or show welcome
    if (this.activeTab === filePath) {
      const remaining = Array.from(this.tabs.keys());
      if (remaining.length > 0) {
        this.activateTab(remaining[remaining.length - 1]);
      } else {
        this.activeTab = null;
        const welcome = document.getElementById('editor-welcome');
        if (welcome) welcome.style.display = '';
      }
    }
  }

  isDirty(filePath: string): boolean { return this.tabs.get(filePath)?.dirty === true; }
  hasDirtyUnder(rootPath: string): boolean {
    return [...this.tabs.entries()].some(([filePath, tab]) => (filePath === rootPath || filePath.startsWith(`${rootPath}/`) || filePath.startsWith(`${rootPath}\\`)) && tab.dirty);
  }
  getOpenFilePathsUnder(rootPath: string): string[] {
    return [...this.tabs.keys()].filter((filePath) => filePath === rootPath || filePath.startsWith(`${rootPath}/`) || filePath.startsWith(`${rootPath}\\`));
  }

  layoutAll() {
    this.tabs.forEach(tab => tab.editor.layout());
  }

  private detectLanguage(fileName: string): string {
    const ext = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    const map: Record<string, string> = {
      '.ts': 'typescript', '.tsx': 'typescriptreact',
      '.js': 'javascript', '.jsx': 'javascriptreact',
      '.html': 'html', '.htm': 'html',
      '.css': 'css', '.scss': 'scss', '.less': 'less',
      '.json': 'json', '.md': 'markdown', '.txt': 'plaintext',
      '.py': 'python', '.go': 'go', '.rs': 'rust', '.r': 'r',
      '.java': 'java', '.cs': 'csharp',
      '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.c++': 'cpp', '.c': 'c', '.h': 'c',
      '.sh': 'shell', '.ps1': 'powershell', '.bat': 'bat',
      '.xml': 'xml', '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
      '.sql': 'sql', '.php': 'php', '.rb': 'ruby',
      '.dockerfile': 'dockerfile',
    };
    return map[ext] || 'plaintext';
  }

  isFileOpen(filePath: string): boolean {
    return this.tabs.has(filePath);
  }

  updateFilePath(oldPath: string, newPath: string, newName: string) {
    const entries = [...this.tabs.entries()].filter(([filePath]) => filePath === oldPath || filePath.startsWith(`${oldPath}/`) || filePath.startsWith(`${oldPath}\\`));
    if (!entries.length) return;
    for (const [key, tab] of entries) {
      const updatedPath = key === oldPath ? newPath : `${newPath}${key.slice(oldPath.length)}`;
      this.tabs.delete(key);
      tab.filePath = updatedPath;
      if (key === oldPath) tab.fileName = newName;
      this.tabs.set(updatedPath, tab);
      if (this.activeTab === key) this.activeTab = updatedPath;
      const nameEl = tab.tabEl.querySelector('.tab-name');
      if (nameEl && key === oldPath) nameEl.textContent = newName;
    }
    return;
  }

  getActiveFile(): string | null {
    return this.activeTab;
  }
}
