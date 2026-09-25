import * as electron from 'electron';
import * as path from 'path';
import { registerFileHandlers, registerWorkspaceHandlers, getLastWorkspace } from './ipc/file-handlers';
import { registerTerminalHandlers } from './ipc/terminal-handlers';
import { registerGitHandlers } from './ipc/git-handlers';
import { registerSearchHandlers } from './ipc/search-handlers';

const { app, BrowserWindow } = electron;
type BrowserWindowType = electron.BrowserWindow;

let mainWindow: BrowserWindowType | null = null;

function createWindow(): BrowserWindowType {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Jameson IDE',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

app.whenReady().then(() => {
  const win = createWindow();

  registerFileHandlers(win);
  registerWorkspaceHandlers(win);
  registerTerminalHandlers(win);
  registerGitHandlers(win);
  registerSearchHandlers(win);

  // Auto-restore last workspace
  const lastWorkspace = getLastWorkspace();
  if (lastWorkspace) {
    win.webContents.on('did-finish-load', () => {
      win.webContents.send('restore-workspace', lastWorkspace);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
