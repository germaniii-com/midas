import { app, BrowserWindow } from 'electron';
import { spawn, type ChildProcess } from 'child_process';
import { createServer } from 'net';
import type { AddressInfo } from 'net';
import path from 'path';

let backendProcess: ChildProcess | null = null;
let backendPort = 5001;

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

function waitForServer(url: string, timeout = 30000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch {}
      if (Date.now() - start > timeout) {
        return reject(new Error(`Server at ${url} not ready within ${timeout}ms`));
      }
      setTimeout(check, 200);
    };
    check();
  });
}

function getBackendDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  return path.resolve(__dirname, '..', '..', '..', 'backend');
}

function getDatabaseDir(): string {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'data');
  }
  return path.resolve(__dirname, '..', '..', '..', 'sqlite_data');
}

async function startBackend(): Promise<number> {
  const port = await findFreePort();
  const isPackaged = app.isPackaged;
  const backendDir = getBackendDir();
  const dbDir = getDatabaseDir();

  const env: Record<string, string> = {
    PORT: String(port),
    NODE_ENV: isPackaged ? 'production' : 'development',
    STORAGE_MODE: 'local',
    DATABASE_DIR: dbDir,
    PATH: process.env.PATH ?? '',
    HOME: process.env.HOME ?? '',
  };

  if (isPackaged) {
    backendProcess = spawn(process.execPath, ['dist/index.js'], {
      cwd: backendDir,
      env: { ...env, ELECTRON_RUN_AS_NODE: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    backendProcess = spawn('npx', ['tsx', 'src/index.ts'], {
      cwd: backendDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  backendProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });
  backendProcess.stderr?.on('data', (data: Buffer) => {
    console.error(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.on('exit', (code) => {
    console.log(`Backend process exited with code ${code}`);
  });

  await waitForServer(`http://127.0.0.1:${port}/api/health`);
  return port;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.mjs'),
      sandbox: false,
      additionalArguments: [`--backend-url=http://127.0.0.1:${backendPort}`],
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

app.whenReady().then(async () => {
  try {
    backendPort = await startBackend();
    createWindow();
  } catch (err) {
    console.error('Failed to start backend:', err);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  cleanup();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanup();
});

function cleanup() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}
