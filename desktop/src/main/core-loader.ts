import { app } from 'electron';
import { createRequire } from 'module';
import path from 'path';

export function getCoreNodeModulesDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'node_modules');
  }
  return path.resolve(__dirname, '..', '..', 'release-backend-deps', 'node_modules');
}

export function getDrizzleDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'drizzle');
  }
  return path.resolve(__dirname, '..', '..', '..', 'backend', 'drizzle');
}

export function getDatabaseDir(): string {
  if (app.isPackaged) {
    return path.join(app.getPath('userData'), 'data');
  }
  return path.resolve(__dirname, '..', '..', '..', 'sqlite_data');
}

function requireFromCore(name: string): unknown {
  const dir = getCoreNodeModulesDir();
  const req = createRequire(path.join(dir, 'noop.js'));
  return req(name);
}

export function loadCore(): typeof import('@midas/core') {
  return requireFromCore('@midas/core') as typeof import('@midas/core');
}

export function loadDrizzleMigrator(): typeof import('drizzle-orm/better-sqlite3/migrator') {
  return requireFromCore(
    'drizzle-orm/better-sqlite3/migrator',
  ) as typeof import('drizzle-orm/better-sqlite3/migrator');
}
