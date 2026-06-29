import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import Database, { type Database as DatabaseType } from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

const dbDir = process.env.DATABASE_DIR || path.resolve(__dirname, '../../sqlite_data');
fs.mkdirSync(dbDir, { recursive: true });

const dbPath = path.join(dbDir, 'midas.db');

export const sqliteDb: DatabaseType = new Database(dbPath);
sqliteDb.pragma('journal_mode = WAL');
sqliteDb.pragma('foreign_keys = ON');

export const db = drizzle(sqliteDb);
