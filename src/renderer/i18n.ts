type Params = Record<string, string | number>;

const en: Record<string, string> = {
  // Activity bar / panels
  primaryNav: 'Primary navigation',
  explorer: 'Explorer',
  search: 'Search',
  settings: 'Settings',
  panelNotAvailable: '{panel} panel is not available yet.',
  // Sidebar actions
  newFile: 'New File',
  newFolder: 'New Folder',
  openFolder: 'Open Folder',
  // Search panel
  searchWorkspace: 'Search workspace',
  searchFilesPlaceholder: 'Search files',
  searchFilesLabel: 'Search files',
  clearSearch: 'Clear search',
  matchCase: 'Match case',
  searchResults: 'Search results',
  searching: 'Searching…',
  noResults: 'No results',
  resultsCount: '{count} result{plural}',
  resultsCountPlus: '{count}+ results',
  openWorkspaceToSearch: 'Open a workspace to search.',
  searchFailed: 'Search failed: {error}',
  // Tabs / editor
  openFiles: 'Open files',
  toggleTerminal: 'Show or hide terminal',
  saved: '[saved]',
  lineCol: 'Ln {line}, Col {col}',
  plainText: 'Plain Text',
  saveBeforeClose: 'Save changes to "{name}" before closing?',
  discardChanges: 'Discard changes to "{name}"?',
  unableToOpenFile: 'Unable to open file: {error}',
  unableToSaveFile: 'Unable to save file: {error}',
  unableToOpenWorkspace: 'Unable to open workspace: {error}',
  // Welcome screen
  welcomeSubtitle: 'Lightweight Code Editor',
  shortcutSave: 'Save',
  shortcutNewFile: 'New File',
  shortcutQuickOpen: 'Quick Open',
  // Bottom panel / terminal
  terminal: 'Terminal',
  newTerminal: 'New Terminal',
  clearTerminal: 'Clear',
  closePanel: 'Close Panel',
  terminalSessions: 'Terminal sessions',
  terminateTerminal: 'Terminate terminal',
  terminateTerminalConfirm: 'Terminate this terminal?',
  processExited: '[Process exited with code {code}]',
  // Run
  run: 'Run',
  noFileOpen: 'No file open',
  tsxRunUnavailable: 'Run is not available for TypeScript/JSX files without a configured transpiler.',
  // File explorer
  rename: 'Rename',
  delete: 'Delete',
  newFileName: 'New File Name',
  newFolderName: 'New Folder Name',
  deleteConfirm: 'Delete "{name}"?',
  saveBeforeDelete: 'Save changes to "{name}" before deleting?',
  failedToCreateFile: 'Failed to create file: {error}',
  failedToCreateFolder: 'Failed to create folder: {error}',
  failedToRename: 'Failed to rename: {error}',
  failedToDelete: 'Failed to delete: {error}',
  // Markdown preview
  previewTitle: 'Preview: {title}',
  previewError: 'Preview Error',
  markdownRenderFailed: 'Failed to render markdown.',
  resizeMarkdownPreview: 'Resize Markdown Preview',
};

const zh: Record<string, string> = {
  // Activity bar / panels
  primaryNav: '主导航',
  explorer: '资源管理器',
  search: '搜索',
  settings: '设置',
  panelNotAvailable: '{panel} 面板暂不可用。',
  // Sidebar actions
  newFile: '新建文件',
  newFolder: '新建文件夹',
  openFolder: '打开文件夹',
  // Search panel
  searchWorkspace: '搜索工作区',
  searchFilesPlaceholder: '搜索文件',
  searchFilesLabel: '搜索文件',
  clearSearch: '清除搜索',
  matchCase: '区分大小写',
  searchResults: '搜索结果',
  searching: '搜索中…',
  noResults: '无结果',
  resultsCount: '{count} 条结果',
  resultsCountPlus: '{count}+ 条结果',
  openWorkspaceToSearch: '请先打开工作区再搜索。',
  searchFailed: '搜索失败：{error}',
  // Tabs / editor
  openFiles: '已打开的文件',
  toggleTerminal: '显示或隐藏终端',
  saved: '[已保存]',
  lineCol: '第 {line} 行，第 {col} 列',
  plainText: '纯文本',
  saveBeforeClose: '关闭前保存对“{name}”的更改吗？',
  discardChanges: '放弃对“{name}”的更改吗？',
  unableToOpenFile: '无法打开文件：{error}',
  unableToSaveFile: '无法保存文件：{error}',
  unableToOpenWorkspace: '无法打开工作区：{error}',
  // Welcome screen
  welcomeSubtitle: '轻量级代码编辑器',
  shortcutSave: '保存',
  shortcutNewFile: '新建文件',
  shortcutQuickOpen: '快速打开',
  // Bottom panel / terminal
  terminal: '终端',
  newTerminal: '新建终端',
  clearTerminal: '清空',
  closePanel: '关闭面板',
  terminalSessions: '终端会话',
  terminateTerminal: '终止终端',
  terminateTerminalConfirm: '终止此终端？',
  processExited: '[进程已退出，退出码 {code}]',
  // Run
  run: '运行',
  noFileOpen: '没有打开的文件',
  tsxRunUnavailable: '未配置转译器，无法运行 TypeScript/JSX 文件。',
  // File explorer
  rename: '重命名',
  delete: '删除',
  newFileName: '新文件名',
  newFolderName: '新文件夹名',
  deleteConfirm: '删除“{name}”？',
  saveBeforeDelete: '删除前保存对“{name}”的更改吗？',
  failedToCreateFile: '创建文件失败：{error}',
  failedToCreateFolder: '创建文件夹失败：{error}',
  failedToRename: '重命名失败：{error}',
  failedToDelete: '删除失败：{error}',
  // Markdown preview
  previewTitle: '预览：{title}',
  previewError: '预览错误',
  markdownRenderFailed: 'Markdown 渲染失败。',
  resizeMarkdownPreview: '调整 Markdown 预览大小',
};

const useChinese = typeof navigator !== 'undefined' && /^zh/i.test(navigator.language || '');

export function t(key: string, params?: Params): string {
  const template = (useChinese ? zh[key] : en[key]) ?? en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (
    params[name] !== undefined ? String(params[name]) : match
  ));
}
