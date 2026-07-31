import { eq, and, sql } from 'drizzle-orm';
import { db, sqliteDb } from '../db/index.js';
import { budgetBinders, syncTargets, syncJobs, transactionAttachments } from '../db/schema.js';
import { storage } from '../storage/index.js';

export interface SyncTarget {
  id: string;
  binderId: string;
  host: string;
  autoSyncInterval: number | null;
  lastSyncedAt: string | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface SyncStatus {
  status: string;
  phase?: string;
  currentTable?: string;
  totalRecords?: number;
  syncedRecords?: number;
  progress?: number;
  lastSyncedAt?: string | null;
  lastError?: string | null;
}

export async function listSyncTargets(binderId: string): Promise<SyncTarget[]> {
  return db.select().from(syncTargets).where(eq(syncTargets.binderId, binderId)).orderBy(syncTargets.createdAt);
}

export async function createSyncTarget(binderId: string, input: { host: string; password: string; autoSyncInterval?: number }): Promise<SyncTarget> {
  const [binder] = await db.select().from(budgetBinders).where(eq(budgetBinders.id, binderId)).limit(1);
  if (!binder) throw new Error('Binder not found');

  const [target] = await db.insert(syncTargets).values({
    binderId,
    host: input.host.replace(/\/+$/, ''),
    password: input.password,
    autoSyncInterval: input.autoSyncInterval ?? null,
  }).returning();

  return target;
}

export async function updateSyncTarget(binderId: string, targetId: string, input: { host?: string; password?: string; autoSyncInterval?: number | null }): Promise<SyncTarget> {
  const values: Record<string, unknown> = {};
  if (input.host !== undefined) values.host = input.host.replace(/\/+$/, '');
  if (input.password !== undefined) values.password = input.password;
  if (input.autoSyncInterval !== undefined) values.autoSyncInterval = input.autoSyncInterval;

  const [target] = await db.update(syncTargets).set(values).where(and(eq(syncTargets.id, targetId), eq(syncTargets.binderId, binderId))).returning();
  if (!target) throw new Error('Sync target not found');
  return target;
}

export async function deleteSyncTarget(binderId: string, targetId: string): Promise<void> {
  await db.delete(syncTargets).where(and(eq(syncTargets.id, targetId), eq(syncTargets.binderId, binderId)));
}

export function upsertRows(table: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT OR REPLACE INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
  const stmt = sqliteDb.prepare(sql);
  for (const row of rows) {
    stmt.run(...columns.map(c => row[c] ?? null));
  }
}
