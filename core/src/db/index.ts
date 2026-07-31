import path from 'node:path';
import fs from 'node:fs';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

const dbDir = process.env.DATABASE_DIR || path.resolve(process.cwd(), 'sqlite_data');
fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'midas.db');

export const sqliteDb: DatabaseType = new Database(dbPath);
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('foreign_keys = ON');

export const db = drizzle(sqliteDb, { schema });
