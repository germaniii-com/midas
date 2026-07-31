import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir, platform } from 'node:os';
import { existsSync } from 'node:fs';
import { StorageProvider } from './types.js';

function getPlatformDataDir(): string {
  const platformName = platform();
  const home = homedir();

  if (platformName === 'win32') {
    const appData = process.env.APPDATA || join(home, 'AppData', 'Roaming');
    return join(appData, 'Midas', 'data');
  }
  if (platformName === 'darwin') {
    return join(home, 'Library', 'Application Support', 'Midas', 'data');
  }
  return join(home, '.local', 'share', 'Midas', 'data');
}

function getDataDir(): string {
  if (process.env.STORAGE_MODE === 'local') {
    const dbDir = process.env.DATABASE_DIR || join(process.cwd(), 'sqlite_data');
    return join(dbDir, 'attachments');
  }
  return getPlatformDataDir();
}

const DATA_DIR = getDataDir();

export const localProvider: StorageProvider = {
  async init() {
    await mkdir(DATA_DIR, { recursive: true });
  },

  async uploadFile(objectName: string, buffer: Buffer) {
    const filePath = join(DATA_DIR, objectName);
    await mkdir(join(filePath, '..'), { recursive: true });
    await writeFile(filePath, buffer);
  },

  async getFile(objectName: string): Promise<Buffer> {
    return readFile(join(DATA_DIR, objectName));
  },

  async deleteFile(objectName: string) {
    const filePath = join(DATA_DIR, objectName);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
  },

  generateObjectName(binderId: string, transactionId: string, id: string, extension: string) {
    return `${binderId}/${transactionId}/${id}${extension}`;
  },
};
