import { EditorManager } from '../editor/editor-manager';
import { t } from '../../i18n';

// SVG icon templates
const ICONS = {
  folder: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M14 4H9L7.5 2.5H2a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1z"/></svg>`,
  folderOpen: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#dcb67a"><path d="M1.5 1h5l1.5 1.5H14a1 1 0 011 1V13a1 1 0 01-1 1H2a1 1 0 01-1-1V2a1 1 0 011-.5z"/></svg>`,
  fileDefault: `<svg width="16" height="16" viewBox="0 0 16 16" fill="#cccccc"><path d="M9.5 1h-4a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V4.5L9.5 1zM10 2.5L12.5 5H10V2.5z"/></svg>`,
};

const EXT_COLORS: Record<string, string> = {
  '.ts': '#3178c6', '.tsx': '#3178c6',
  '.js': '#f1e05a', '.jsx': '#f1e05a',
  '.html': '#e44b23', '.htm': '#e44b23',
  '.css': '#563d7c', '.scss': '#c6538c', '.less': '#1d365d',
  '.json': '#f1e05a',
  '.md': '#519aba', '.txt': '#cccccc',
  '.py': '#3572a5',
  '.go': '#00add8',
  '.rs': '#dea584',
  '.java': '#b07219',
  '.cs': '#178600',
  '.cpp': '#f34b7d', '.c': '#555555', '.h': '#555555',
  '.sh': '#89e051', '.ps1': '#012456', '.bat': '#c1f12e',
  '.xml': '#0060ac',
  '.yaml': '#cb171e', '.yml': '#cb171e', '.toml': '#9c4221',
  '.sql': '#e38c00',
  '.php': '#4f5d95',
  '.rb': '#cc342d',
  '.png': '#a074c4', '.jpg': '#a074c4', '.gif': '#a074c4', '.svg': '#a074c4', '.ico': '#a074c4',
};

function fileIconSvg(name: string): string {
  const ext = name.substring(name.lastIndexOf('.')).toLowerCase();
  const color = EXT_COLORS[ext] || '#cccccc';
  return `<svg width="16" height="16" viewBox="0 0 16 16" fill="${color}"><path d="M9.5 1h-4a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h5a.5.5 0 00.5-.5V4.5L9.5 1zM10 2.5L12.5 5H10V2.5z"/></svg>`;
}

export class FileExplorer {
  private container: HTMLElement;
  private editorManager: EditorManager;
  public workspaceRoot: string = '';
  private selectedDirectory: string | null = null;
  private expandedPaths = new Set<string>();
  private watchUnsubscribe: (() => void) | null = null;
  private refreshTimer: number | null = null;
  private workspaceLoadId = 0;

  constructor(sidebar: HTMLElement, editorManager: EditorManager) {
    this.container = sidebar.querySelector('#sidebar-content') as HTMLElement;
    this.editorManager = editorManager;
  }

  async loadWorkspace(rootPath: string) {
    const loadId = ++this.workspaceLoadId;
    this.watchUnsubscribe?.();
    this.watchUnsubscribe = null;
    if (this.workspaceRoot && window.api?.file?.unwatch) {
      try { await window.api.file.unwatch(this.workspaceRoot); } catch { /* old watcher may already be closed */ }
    }
    this.workspaceRoot = rootPath;
    this.selectedDirectory = null;

    // Check if running in web context without Electron API
    if (!window.api?.workspace?.open) {
      console.error('window.api is not available - running in unsupported web context');
      return;
    }

    try {
      await window.api.workspace.open(rootPath);
      if (loadId !== this.workspaceLoadId) return;
      await window.api.file.watch(rootPath);
    } catch (error) {
      if (loadId === this.workspaceLoadId) {
        this.workspaceRoot = '';
        alert(t('unableToOpenWorkspace', { error: error instanceof Error ? error.message : String(error) }));
      }
      return;
    }
    this.watchUnsubscribe = window.api.file.onWatchEvent((payload) => {
      const root = this.workspaceRoot.replace(/[\\/]+$/, '');
      const changed = payload.path.replace(/[\\/]+$/, '');
      if (changed !== root && !changed.startsWith(`${root}\\`) && !changed.startsWith(`${root}/`)) return;
      if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
      this.refreshTimer = window.setTimeout(() => { this.refreshTimer = null; void this.refresh(); }, 100);
    });
    await this.refresh();

    // Update window title
    const folderName = rootPath.split(/[\\/]/).pop() || rootPath;
    document.title = `${folderName} - Jameson IDE`;
  }

  async refresh() {
    if (!this.workspaceRoot) return;
    let nodes: FileNode[];
    try {
      nodes = await window.api.file.listDir(this.workspaceRoot);
    } catch (error) {
      console.error('Failed to refresh file tree:', error);
      return;
    }
    this.container.innerHTML = '';
    const tree = document.createElement('div');
    tree.className = 'file-tree';
    for (const node of nodes) {
      tree.appendChild(this.createTreeNode(node, 0));
    }
    this.container.appendChild(tree);
  }

  private createTreeNode(node: FileNode, depth: number): HTMLElement {
    const item = document.createElement('div');

    const row = document.createElement('div');
    row.className = 'tree-item';
    row.setAttribute('role', node.type === 'directory' ? 'treeitem' : 'treeitem');
    row.tabIndex = 0;
    row.setAttribute('aria-label', node.name);
    row.style.paddingLeft = `${8 + depth * 16}px`;

    const icon = document.createElement('span');
    icon.className = 'tree-item-icon';
    icon.innerHTML = node.type === 'directory' ? ICONS.folder : fileIconSvg(node.name);

    const name = document.createElement('span');
    name.className = 'tree-item-name';
    name.textContent = node.name;

    row.appendChild(icon);
    row.appendChild(name);
    item.appendChild(row);

    if (node.type === 'directory') {
      const children = document.createElement('div');
      children.className = 'tree-children';

      if (node.children) {
        for (const child of node.children) {
          children.appendChild(this.createTreeNode(child, depth + 1));
        }
      }

      item.appendChild(children);

      let expanded = this.expandedPaths.has(node.path);
      children.classList.toggle('expanded', expanded);
      row.classList.toggle('selected', this.selectedDirectory === node.path);
      icon.innerHTML = expanded ? ICONS.folderOpen : ICONS.folder;
      row.addEventListener('click', () => {
        this.selectedDirectory = node.path;
        this.container.querySelectorAll('.tree-item.selected').forEach((el) => el.classList.remove('selected'));
        row.classList.add('selected');
        expanded = !expanded;
        if (expanded) this.expandedPaths.add(node.path); else this.expandedPaths.delete(node.path);
        children.classList.toggle('expanded', expanded);
        icon.innerHTML = expanded ? ICONS.folderOpen : ICONS.folder;
      });
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); } });

      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY, [
          { label: t('newFile'), action: () => this.createNewFile(node.path) },
          { label: t('newFolder'), action: () => this.createNewFolder(node.path) },
          { separator: true },
          { label: t('rename'), action: () => this.renameItem(row, node) },
          { label: t('delete'), action: () => this.deleteItem(node) },
        ]);
      });
    } else {
      row.addEventListener('click', () => {
        this.container.querySelectorAll('.tree-item.active').forEach(el => el.classList.remove('active'));
        row.classList.add('active');
        this.editorManager.openFile(node.path, node.name);
      });
      row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); } });

      row.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.showContextMenu(e.clientX, e.clientY, [
          { label: t('rename'), action: () => this.renameItem(row, node) },
          { label: t('delete'), action: () => this.deleteItem(node) },
        ]);
      });
    }

    return item;
  }

  private showContextMenu(x: number, y: number, items: Array<{ label?: string; action?: () => void; separator?: boolean }>) {
    this.removeContextMenu();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.id = 'context-menu';

    for (const item of items) {
      if (item.separator) {
        const sep = document.createElement('div');
        sep.className = 'context-menu-separator';
        menu.appendChild(sep);
        continue;
      }
      const el = document.createElement('div');
      el.className = 'context-menu-item';
      el.textContent = item.label || '';
      el.addEventListener('click', () => {
        this.removeContextMenu();
        item.action?.();
      });
      menu.appendChild(el);
    }

    document.body.appendChild(menu);

    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = `${x - rect.width}px`;
    if (rect.bottom > window.innerHeight) menu.style.top = `${y - rect.height}px`;

    document.addEventListener('click', this.removeContextMenuHandler, { once: true });
  }

  private removeContextMenuHandler = () => this.removeContextMenu();

  private removeContextMenu() {
    document.getElementById('context-menu')?.remove();
  }

  public async createNewFile(dirPath: string) {
    const name = await this.promptInput(t('newFileName'));
    if (name) {
      try {
        const filePath = await window.api.file.createFile(dirPath, name);
        await this.refresh();
        this.editorManager.openFile(filePath, name);
      } catch (err) {
        console.error('Failed to create file:', err);
        alert(t('failedToCreateFile', { error: err instanceof Error ? err.message : String(err) }));
      }
    }
  }

  /** The folder that should receive toolbar-created files and folders. */
  getSelectedDirectory(): string | null {
    if (!this.selectedDirectory || !this.workspaceRoot) return null;
    const root = this.workspaceRoot.replace(/[\\/]+$/, '');
    const selected = this.selectedDirectory.replace(/[\\/]+$/, '');
    if (selected === root || selected.startsWith(`${root}\\`) || selected.startsWith(`${root}/`)) {
      return this.selectedDirectory;
    }
    return null;
  }

  public async createNewFolder(dirPath: string) {
    const name = await this.promptInput(t('newFolderName'));
    if (name) {
      try {
        await window.api.file.createDir(dirPath, name);
        await this.refresh();
      } catch (err) {
        console.error('Failed to create folder:', err);
        alert(t('failedToCreateFolder', { error: err instanceof Error ? err.message : String(err) }));
      }
    }
  }

  private renameItem(row: HTMLElement, node: FileNode) {
    const nameSpan = row.querySelector('.tree-item-name') as HTMLElement;
    const input = document.createElement('input');
    input.className = 'tree-item-input';
    input.value = node.name;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    const finish = async () => {
      const newName = input.value.trim();
      if (newName && newName !== node.name) {
        try {
          await window.api.file.rename(node.path, newName);
          const newPath = node.path.slice(0, node.path.length - node.name.length) + newName;
          this.editorManager.updateFilePath(node.path, newPath, newName);
          await this.refresh();
        } catch (err) {
          console.error('Failed to rename:', err);
          alert(t('failedToRename', { error: err instanceof Error ? err.message : String(err) }));
        }
      } else {
        await this.refresh();
      }
    };

    input.addEventListener('blur', finish);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = node.name; input.blur(); }
    });
  }

  private async deleteItem(node: FileNode) {
    const confirmed = confirm(t('deleteConfirm', { name: node.name }));
    if (confirmed) {
      try {
        if (this.editorManager.hasDirtyUnder(node.path)) {
          const save = confirm(t('saveBeforeDelete', { name: node.name }));
          if (save) {
            for (const openPath of this.editorManager.getOpenFilePathsUnder(node.path)) {
              if (this.editorManager.isDirty(openPath) && !(await this.editorManager.saveFile(openPath))) return;
            }
          }
          if (!save && !confirm(t('discardChanges', { name: node.name }))) return;
        }
        await window.api.file.delete(node.path);
        for (const openPath of this.editorManager.getOpenFilePathsUnder(node.path)) await this.editorManager.closeFile(openPath, true);
        await this.refresh();
      } catch (err) {
        console.error('Failed to delete:', err);
        alert(t('failedToDelete', { error: err instanceof Error ? err.message : String(err) }));
      }
    }
  }


  private promptInput(prompt: string): Promise<string | null> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1001;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';

      const dialog = document.createElement('div');
      dialog.style.cssText = 'background:#2d2d30;border:1px solid #454545;border-radius:8px;padding:20px;min-width:340px;box-shadow:0 12px 40px rgba(0,0,0,0.5);';

      const label = document.createElement('div');
      label.textContent = prompt;
      label.style.cssText = 'margin-bottom:10px;font-size:13px;color:#969696;';

      const input = document.createElement('input');
      input.style.cssText = 'width:100%;background:#1e1e1e;border:1px solid #3e3e42;color:#cccccc;padding:8px 10px;font-size:13px;border-radius:4px;outline:none;font-family:Segoe UI,system-ui,sans-serif;'

      const confirm = () => { overlay.remove(); resolve(input.value.trim() || null); };
      const cancel = () => { overlay.remove(); resolve(null); };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirm();
        if (e.key === 'Escape') cancel();
      });

      dialog.appendChild(label);
      dialog.appendChild(input);
      overlay.appendChild(dialog);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) cancel(); });
      document.body.appendChild(overlay);
      input.focus();
    });
  }
}
