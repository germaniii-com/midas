import { app, BrowserWindow } from 'electron';
import path from 'path';
import { registerIpcHandlers, initCore } from './ipc-handlers';
import { SyncScheduler } from './sync-scheduler';
import { getDatabaseDir } from './core-loader';

function configureEnvironment() {
  const dbDir = getDatabaseDir();
  process.env.DATABASE_DIR = dbDir;
  process.env.STORAGE_MODE = 'local';
  process.env.NODE_ENV = app.isPackaged ? 'production' : 'development';
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.mjs'),
      sandbox: false,
    },
  });

  if (!app.isPackaged) {
    const devUrl = process.env['ELECTRON_RENDERER_URL'] || process.env['VITE_DEV_SERVER_URL'];
    if (devUrl) {
      win.loadURL(devUrl);
    } else {
      win.loadURL('http://localhost:5173');
    }
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(process.resourcesPath, 'frontend', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  try {
    configureEnvironment();
    initCore();
    registerIpcHandlers();

    SyncScheduler.init();
    SyncScheduler.getInstance()
      .loadAll()
      .catch((err) => {
        console.error('Failed to load auto-sync jobs:', err);
      });

    createWindow();
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  SyncScheduler.getInstance().removeAll();
});
