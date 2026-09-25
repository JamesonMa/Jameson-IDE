import * as monaco from 'monaco-editor';
import './styles/main.css';
import 'katex/dist/katex.min.css';
import { createLayout } from './components/layout';
import { EditorManager } from './components/editor/editor-manager';
import { FileExplorer } from './components/sidebar/file-explorer';
import { TerminalManager } from './components/terminal/terminal';
import { t } from './i18n';
import type { SearchResult } from '../shared/types/ipc';

// Configure Monaco workers
(self as any).MonacoEnvironment = {
  getWorkerUrl: function (_moduleId: string, label: string) {
    if (label === 'json') return './json.worker.js';
    if (label === 'typescript' || label === 'javascript') return './ts.worker.js';
    return './editor.worker.js';
  },
};

let initialized = false;
let cleanupHandlers: Array<() => void> = [];

async function init() {
  if (initialized) {
    console.warn('init() called multiple times - already initialized');
    return;
  }
  initialized = true;

  const app = document.getElementById('app');
  if (!app) return;

  const editorManager = new EditorManager();
  const { sidebar, activityBar, terminalContainer, terminalSessionList, bottomPanel, editorTerminalToggle } = createLayout(app, editorManager);

  const fileExplorer = new FileExplorer(sidebar, editorManager);
  const terminalManager = new TerminalManager();

  // Track cleanup for potential hot-reload scenarios
  const addCleanableListener = (element: Element | null | undefined, event: string, handler: EventListener) => {
    if (!element) return;
    element.addEventListener(event, handler);
    cleanupHandlers.push(() => element.removeEventListener(event, handler));
  };

  // Initialize terminal
  terminalManager.setContainer(terminalContainer, terminalSessionList);
  terminalManager.init();

  const terminalToggleHandler = () => {
    if (!bottomPanel.classList.contains('hidden') && terminalManager.getSessionCount() === 0) {
      void terminalManager.newTerminal();
    }
  };
  editorTerminalToggle.addEventListener('terminal-toggle', terminalToggleHandler);
  cleanupHandlers.push(() => editorTerminalToggle.removeEventListener('terminal-toggle', terminalToggleHandler));

  // Wire up sidebar buttons
  const newFileHandler = () => {
    const directory = fileExplorer.getSelectedDirectory() || fileExplorer.workspaceRoot;
    if (directory) void fileExplorer.createNewFile(directory);
  };
  addCleanableListener(document.getElementById('new-file-btn'), 'click', newFileHandler);

  const newFolderHandler = () => {
    const directory = fileExplorer.getSelectedDirectory() || fileExplorer.workspaceRoot;
    if (directory) void fileExplorer.createNewFolder(directory);
  };
  addCleanableListener(document.getElementById('new-folder-btn'), 'click', newFolderHandler);

  // Terminal controls
  const terminalNewHandler = () => void terminalManager.newTerminal();
  addCleanableListener(document.getElementById('terminal-new'), 'click', terminalNewHandler);

  const terminalClearHandler = () => terminalManager.clear();
  addCleanableListener(document.getElementById('terminal-clear'), 'click', terminalClearHandler);

  const terminalCloseHandler = () => {
    bottomPanel.classList.add('hidden');
    editorManager.layoutAll();
  };
  addCleanableListener(document.getElementById('terminal-close'), 'click', terminalCloseHandler);

  // Search panel
  const sidebarContent = document.getElementById('sidebar-content');
  const searchPanel = document.getElementById('search-panel');
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const searchCaseSensitive = document.getElementById('search-case-sensitive') as HTMLInputElement | null;
  const searchClear = document.getElementById('search-clear');
  const searchStatus = document.getElementById('search-status');
  const searchResults = document.getElementById('search-results');
  let searchRequest = 0;
  let searchTimer: number | null = null;

  const clearSearchResults = () => {
    searchResults?.replaceChildren();
    if (searchStatus) searchStatus.textContent = '';
  };

  const relativeSearchPath = (root: string, filePath: string) => {
    const normalizedRoot = root.replace(/[\\/]+$/, '');
    if (filePath === normalizedRoot) return filePath;
    if (filePath.startsWith(`${normalizedRoot}\\`)) return filePath.slice(normalizedRoot.length + 1);
    if (filePath.startsWith(`${normalizedRoot}/`)) return filePath.slice(normalizedRoot.length + 1);
    return filePath;
  };

  const renderSearchResults = (root: string, results: SearchResult[]) => {
    if (!searchResults) return;
    searchResults.replaceChildren();
    for (const result of results) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'search-result';
      button.setAttribute('role', 'option');
      const file = document.createElement('span');
      file.className = 'search-result-path';
      file.textContent = relativeSearchPath(root, result.path);
      const line = document.createElement('span');
      line.className = 'search-result-line';
      line.textContent = `${result.line}:${result.column}  ${result.text}`;
      button.append(file, line);
      button.addEventListener('click', () => {
        void editorManager.openFileAt(result.path, result.line, result.column);
      });
      searchResults.appendChild(button);
    }
  };

  const runSearch = async () => {
    const query = searchInput?.value.trim() || '';
    const root = fileExplorer.workspaceRoot;
    const request = ++searchRequest;
    if (!query) {
      clearSearchResults();
      return;
    }
    if (!root || !window.api?.search?.inWorkspace) {
      if (searchStatus) searchStatus.textContent = t('openWorkspaceToSearch');
      return;
    }
    if (searchStatus) searchStatus.textContent = t('searching');
    try {
      const results = await window.api.search.inWorkspace(root, query, {
        caseSensitive: searchCaseSensitive?.checked || false,
        maxResults: 500,
      });
      if (request !== searchRequest) return;
      renderSearchResults(root, results);
      if (searchStatus) searchStatus.textContent = results.length === 0
        ? t('noResults')
        : results.length === 500
          ? t('resultsCountPlus', { count: results.length })
          : t('resultsCount', { count: results.length, plural: results.length === 1 ? '' : 's' });
    } catch (error) {
      if (request !== searchRequest) return;
      clearSearchResults();
      if (searchStatus) searchStatus.textContent = t('searchFailed', { error: error instanceof Error ? error.message : String(error) });
    }
  };

  const scheduleSearch = () => {
    if (searchTimer !== null) window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      searchTimer = null;
      void runSearch();
    }, 180);
  };
  const searchInputHandler = (event: Event) => {
    console.log('Search input event, value:', searchInput?.value, 'focused:', document.activeElement === searchInput);
    scheduleSearch();
  };
  addCleanableListener(searchInput, 'input', searchInputHandler);

  const searchKeydownHandler = (event: Event) => {
    const e = event as KeyboardEvent;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTimer !== null) window.clearTimeout(searchTimer);
      searchTimer = null;
      void runSearch();
    }
  };
  addCleanableListener(searchInput, 'keydown', searchKeydownHandler);

  const searchCaseSensitiveHandler = () => void runSearch();
  addCleanableListener(searchCaseSensitive, 'change', searchCaseSensitiveHandler);

  const searchClearHandler = () => {
    if (searchInput) searchInput.value = '';
    clearSearchResults();
    searchInput?.focus();
  };
  addCleanableListener(searchClear, 'click', searchClearHandler);

  const explorerActions = document.querySelector('.explorer-actions') as HTMLElement | null;
  const setActivityPanel = (panel: string, icon: HTMLElement) => {
    activityBar.querySelectorAll('.activity-icon').forEach((item) => item.classList.remove('active'));
    icon.classList.add('active');
    const titles: Record<string, string> = { explorer: t('explorer'), search: t('search'), settings: t('settings') };
    const title = document.getElementById('sidebar-title');
    if (title) title.textContent = titles[panel] || panel;
  };
  const showExplorer = (icon: HTMLElement) => {
    setActivityPanel('explorer', icon);
    if (sidebarContent) sidebarContent.hidden = false;
    if (searchPanel) searchPanel.hidden = true;
    if (explorerActions) explorerActions.hidden = false;
  };
  const showSearch = (icon: HTMLElement) => {
    setActivityPanel('search', icon);
    if (sidebarContent) sidebarContent.hidden = true;
    if (searchPanel) searchPanel.hidden = false;
    if (explorerActions) explorerActions.hidden = true;
    searchInput?.focus();
  };

  // Activity bar click handling
  const activityBarClickHandler = (e: Event) => {
    const icon = (e.target as HTMLElement).closest('.activity-icon') as HTMLElement;
    if (!icon) return;
    const panel = icon.dataset.panel;
    if (!panel) return;
    if (panel === 'search') {
      showSearch(icon);
      return;
    }
    if (panel === 'explorer') {
      showExplorer(icon);
      return;
    }
    if (panel !== 'explorer') {
      alert(t('panelNotAvailable', { panel: `${panel[0].toUpperCase()}${panel.slice(1)}` }));
      return;
    }
  };
  addCleanableListener(activityBar, 'click', activityBarClickHandler);

  // Check if running in web context without Electron API
  if (!window.api?.workspace?.openDialog) {
    console.warn('Running in web context without Electron API - some features unavailable');
    console.warn('Use jameson-ide.html for the standalone web version');
    return;
  }

  // Open folder buttons (sidebar + welcome screen)
  const openFolder = async () => {
    const folder = await window.api.workspace.openDialog();
    if (folder) fileExplorer.loadWorkspace(folder);
  };

  const openFolderHandler = () => void openFolder();
  addCleanableListener(document.getElementById('open-folder-btn'), 'click', openFolderHandler);
  addCleanableListener(document.getElementById('welcome-open-folder'), 'click', openFolderHandler);

  // Run code button
  const runCodeHandler = async () => {
    const filePath = editorManager.getActiveFilePath();
    const language = editorManager.getActiveLanguage();
    if (!filePath || !language) {
      alert(t('noFileOpen'));
      return;
    }
    if (['typescript', 'typescriptreact', 'javascriptreact'].includes(language)) {
      alert(t('tsxRunUnavailable'));
      return;
    }

    // Save before running
    if (!(await editorManager.saveFile(filePath))) return;

    // Show terminal panel
    const panel = document.getElementById('bottom-panel');
    if (panel) {
      panel.classList.remove('hidden');
      editorManager.layoutAll();
    }

    terminalManager.clear();
    try {
      await terminalManager.run(filePath, language);
    } catch (error) {
      alert(error instanceof Error ? error.message : String(error));
    }
  };
  addCleanableListener(document.getElementById('run-code-btn'), 'click', runCodeHandler);

  // Editor zoom with Ctrl+Wheel
  const editorWheelHandler = (event: Event) => {
    const e = event as WheelEvent;
    if (e.ctrlKey) {
      e.preventDefault();
      const filePath = editorManager.getActiveFilePath();
      if (!filePath) return;

      const delta = e.deltaY > 0 ? -1 : 1;
      const currentZoom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--editor-font-size') || '14');
      const newZoom = Math.max(8, Math.min(32, currentZoom + delta));
      document.documentElement.style.setProperty('--editor-font-size', `${newZoom}px`);

      // Trigger layout update
      setTimeout(() => editorManager.layoutAll(), 0);
    }
  };
  addCleanableListener(document.getElementById('editor-container'), 'wheel', editorWheelHandler);

  // Check if there's a workspace to restore (fallback)
  const root = await window.api.workspace.getRoot();
  if (root) fileExplorer.loadWorkspace(root);
}

// Cleanup function for hot-reload or testing scenarios
function cleanup() {
  cleanupHandlers.forEach(handler => handler());
  cleanupHandlers = [];
  initialized = false;
}

// Expose cleanup for debugging/testing
if (typeof window !== 'undefined') {
  (window as any).__reinitRenderer = () => {
    cleanup();
    return init();
  };
}

init();
