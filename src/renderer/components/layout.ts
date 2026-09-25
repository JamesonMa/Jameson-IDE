import { EditorManager } from './editor/editor-manager';
import { t } from '../i18n';

export function createLayout(app: HTMLElement, editorManager: EditorManager) {
  // Activity bar (far left icon strip)
  const activityBar = document.createElement('div');
  activityBar.className = 'activity-bar';
  activityBar.setAttribute('role', 'navigation');
  activityBar.setAttribute('aria-label', t('primaryNav'));
  activityBar.innerHTML = `
    <button class="activity-icon active" data-panel="explorer" title="${t('explorer')}" aria-label="${t('explorer')}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M3 7V5a2 2 0 012-2h4l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
        <path d="M3 7h18"/>
      </svg>
    </button>
    <button class="activity-icon" data-panel="search" title="${t('search')}" aria-label="${t('search')}">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="11" cy="11" r="7"/>
        <path d="M16 16l4 4"/>
      </svg>
    </button>
    <div class="activity-bottom">
      <button class="activity-icon" data-panel="settings" title="${t('settings')}" aria-label="${t('settings')}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
      </button>
    </div>
  `;

  // Sidebar
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  sidebar.innerHTML = `
    <div class="sidebar-header">
      <span id="sidebar-title">${t('explorer')}</span>
      <div class="sidebar-actions explorer-actions">
        <button class="sidebar-action-btn" id="new-file-btn" title="${t('newFile')}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M9.5 1h-4a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V4.5L9.5 1zM10 2.5L12.5 5H10V2.5zM6 7h4v1H6V7zm0 2h4v1H6V9zm0 2h3v1H6v-1z"/></svg>
        </button>
        <button class="sidebar-action-btn" id="new-folder-btn" title="${t('newFolder')}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M14 4H9L7.5 2.5H2a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1zM8 8v2H6v1h2v2h1v-2h2V9H9V8H8z"/></svg>
        </button>
        <button class="sidebar-action-btn" id="open-folder-btn" title="${t('openFolder')}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1h5l1.5 1.5H14a1 1 0 011 1V13a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1zm0 1v11h12V4H8L6.5 2.5H2z"/></svg>
        </button>
      </div>
    </div>
    <div class="sidebar-content" id="sidebar-content"></div>
    <div class="search-panel" id="search-panel" aria-label="${t('searchWorkspace')}" hidden>
      <div class="search-input-row">
        <input id="search-input" type="search" placeholder="${t('searchFilesPlaceholder')}" autocomplete="off" aria-label="${t('searchFilesLabel')}" />
        <button id="search-clear" class="search-clear" type="button" title="${t('clearSearch')}" aria-label="${t('clearSearch')}">&times;</button>
      </div>
      <label class="search-option">
        <input id="search-case-sensitive" type="checkbox" />
        <span>${t('matchCase')}</span>
      </label>
      <div id="search-status" class="search-status" role="status" aria-live="polite"></div>
      <div id="search-results" class="search-results" role="listbox" aria-label="${t('searchResults')}"></div>
    </div>
  `;

  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.className = 'sidebar-resize-handle';
  resizeHandle.id = 'sidebar-resize';

  // Main area (tabs + editor)
  const mainArea = document.createElement('div');
  mainArea.className = 'main-area';

  const tabBar = document.createElement('div');
  tabBar.className = 'tab-bar';
  tabBar.setAttribute('role', 'tablist');
  tabBar.setAttribute('aria-label', t('openFiles'));
  tabBar.id = 'tab-bar';
  const editorTerminalToggle = document.createElement('button');
  editorTerminalToggle.id = 'editor-terminal-toggle';
  editorTerminalToggle.className = 'editor-terminal-toggle';
  editorTerminalToggle.type = 'button';
  editorTerminalToggle.title = t('toggleTerminal');
  editorTerminalToggle.setAttribute('aria-label', t('toggleTerminal'));
  editorTerminalToggle.textContent = '〉_';
  tabBar.appendChild(editorTerminalToggle);
  let terminalPanel: HTMLElement | null = null;
  const toggleTerminalPanel = () => {
    const panel = terminalPanel;
    if (!panel) return;
    const visible = panel.classList.toggle('hidden') === false;
    editorTerminalToggle.dispatchEvent(new CustomEvent('terminal-toggle', { detail: { visible } }));
  };
  editorTerminalToggle.addEventListener('click', toggleTerminalPanel);
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === '`') { event.preventDefault(); toggleTerminalPanel(); }
  });

  // Editor wrapper (to hold editor + bottom panel)
  const editorWrapper = document.createElement('div');
  editorWrapper.style.cssText = 'flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;';

  const editorContainer = document.createElement('div');
  editorContainer.className = 'editor-container';
  editorContainer.id = 'editor-container';
  editorContainer.style.flex = '1';

  // Welcome screen
  const welcome = document.createElement('div');
  welcome.className = 'editor-welcome';
  welcome.id = 'editor-welcome';
  welcome.innerHTML = `
    <div class="welcome-logo">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
        <rect x="4" y="4" width="72" height="72" rx="16" stroke="#007acc" stroke-width="2" fill="#007acc20"/>
        <text x="40" y="52" text-anchor="middle" font-size="36" font-weight="bold" fill="#007acc" font-family="Segoe UI, sans-serif">J</text>
      </svg>
    </div>
    <div class="welcome-title">Jameson IDE</div>
    <div class="welcome-subtitle">${t('welcomeSubtitle')}</div>
    <div class="welcome-actions">
      <button class="welcome-btn" id="welcome-open-folder">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 1h5l1.5 1.5H14a1 1 0 011 1V13a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-1zm0 1v11h12V4H8L6.5 2.5H2z"/></svg>
        ${t('openFolder')}
      </button>
    </div>
    <div class="welcome-shortcuts">
      <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>S</kbd><span>${t('shortcutSave')}</span></div>
      <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>N</kbd><span>${t('shortcutNewFile')}</span></div>
      <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>P</kbd><span>${t('shortcutQuickOpen')}</span></div>
    </div>
  `;
  editorContainer.appendChild(welcome);

  // Bottom panel (terminal)
  const bottomPanel = document.createElement('div');
  bottomPanel.className = 'bottom-panel';
  bottomPanel.classList.add('hidden');
  terminalPanel = bottomPanel;
  bottomPanel.id = 'bottom-panel';
  bottomPanel.style.position = 'relative';

  const panelResizeHandle = document.createElement('div');
  panelResizeHandle.className = 'panel-resize-handle';
  bottomPanel.appendChild(panelResizeHandle);

  const panelHeader = document.createElement('div');
  panelHeader.className = 'bottom-panel-header';
  panelHeader.innerHTML = `
    <div class="bottom-panel-tabs">
      <button class="bottom-panel-tab active" data-tab="terminal">${t('terminal')}</button>
    </div>
    <div class="bottom-panel-actions">
      <button class="bottom-panel-action terminal-new-button" id="terminal-new" title="${t('newTerminal')}" aria-label="${t('newTerminal')}">+</button>
      <button class="bottom-panel-action" id="terminal-clear" title="${t('clearTerminal')}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 3h10v1H3V3zm0 9h10v1H3v-1zm0-4.5h7v1H3v-1z"/>
        </svg>
      </button>
      <button class="bottom-panel-action" id="terminal-close" title="${t('closePanel')}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.708.708L7.293 8l-3.647 3.646.708.707L8 8.707z"/>
        </svg>
      </button>
    </div>
  `;
  bottomPanel.appendChild(panelHeader);

  const panelContent = document.createElement('div');
  panelContent.className = 'bottom-panel-content';
  const terminalContainer = document.createElement('div');
  terminalContainer.className = 'terminal-container';
  terminalContainer.setAttribute('role', 'region');
  terminalContainer.setAttribute('aria-label', t('terminal'));
  terminalContainer.id = 'terminal-container';
  panelContent.appendChild(terminalContainer);
  const terminalSessionList = document.createElement('div');
  terminalSessionList.className = 'terminal-session-list';
  terminalSessionList.id = 'terminal-session-list';
  terminalSessionList.setAttribute('role', 'tablist');
  terminalSessionList.setAttribute('aria-label', t('terminalSessions'));
  panelContent.appendChild(terminalSessionList);
  bottomPanel.appendChild(panelContent);

  editorWrapper.appendChild(editorContainer);
  editorWrapper.appendChild(bottomPanel);

  mainArea.appendChild(tabBar);
  mainArea.appendChild(editorWrapper);

  // Panel resize logic
  let resizingPanel = false;
  let startY = 0;
  let startHeight = 0;

  panelResizeHandle.addEventListener('mousedown', (e) => {
    resizingPanel = true;
    startY = e.clientY;
    startHeight = bottomPanel.offsetHeight;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!resizingPanel) return;
    const delta = startY - e.clientY;
    const newHeight = Math.max(100, Math.min(600, startHeight + delta));
    bottomPanel.style.height = `${newHeight}px`;
    editorManager.layoutAll();
  });

  document.addEventListener('mouseup', () => {
    if (resizingPanel) {
      resizingPanel = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // Status bar
  const statusBar = document.createElement('div');
  statusBar.className = 'status-bar';
  statusBar.id = 'status-bar';
  statusBar.innerHTML = `
    <div class="status-bar-left">
      <span class="status-item status-branch" id="status-branch">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm0 2.122a2.25 2.25 0 10-1.5 0v5.256a2.25 2.25 0 101.5 0V5.372A2.25 2.25 0 005 3.25zm6.5 7.5a.75.75 0 10-1.5 0 .75.75 0 001.5 0zm-3-7.5a.75.75 0 10-1.5 0 .75.75 0 001.5 0z"/></svg>
        <span id="branch-name"></span>
      </span>
      <button class="status-item status-run-btn" id="run-code-btn" title="${t('run')}">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2l10 6-10 6V2z"/></svg>
        <span>${t('run')}</span>
      </button>
    </div>
    <div class="status-bar-right">
      <span class="status-item" id="status-position">${t('lineCol', { line: 1, col: 1 })}</span>
      <span class="status-item" id="status-encoding">UTF-8</span>
      <span class="status-item" id="status-language">${t('plainText')}</span>
    </div>
  `;

  // Assemble
  const sidebarWrapper = document.createElement('div');
  sidebarWrapper.className = 'sidebar-wrapper';
  sidebarWrapper.appendChild(sidebar);
  sidebarWrapper.appendChild(resizeHandle);

  app.appendChild(activityBar);
  app.appendChild(sidebarWrapper);
  app.appendChild(mainArea);
  app.appendChild(statusBar);

  editorManager.setContainers(tabBar, editorContainer);

  // Sidebar resize logic
  let isResizing = false;
  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const activityBarWidth = 48;
    const newWidth = Math.max(160, Math.min(500, e.clientX - activityBarWidth));
    document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      editorManager.layoutAll();
    }
  });

  return { sidebar, editorArea: mainArea, activityBar, terminalContainer, terminalSessionList, bottomPanel, editorTerminalToggle };
}
