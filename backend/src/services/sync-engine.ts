import { sqliteDb, db } from '../db';
import { syncJobs, syncTargets } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { storage } from '../storage';

const BATCH_SIZE = 100;

const SYNC_TABLES = [
  'budget_binders',
  'accounts',
  'categories',
  'tags',
  'payees',
  'transactions',
  'account_tags',
  'account_categories',
  'transaction_tags',
  'payment_schedules',
  'payment_schedule_occurrences',
  'investments',
  'transaction_attachments',
];

const ID_TABLES = new Set([
  'budget_binders', 'accounts', 'categories', 'tags', 'payees',
  'transactions', 'payment_schedules', 'payment_schedule_occurrences',
  'investments', 'transaction_attachments',
]);

const JUNCTION_TABLES = new Set([
  'account_tags', 'account_categories', 'transaction_tags',
]);

interface SyncTarget {
  id: string;
  host: string;
  password: string;
}

function remoteFetch(target: SyncTarget, path: string, options: RequestInit = {}) {
  const url = `${target.host.replace(/\/+$/, '')}${path}`;
  const headers: Record<string, string> = {
    'x-sync-password': target.password,
  };
  if (options.headers) {
    const incoming = options.headers as Record<string, string>;
    for (const key of Object.keys(incoming)) {
      headers[key] = incoming[key];
    }
  }
  return fetch(url, { ...options, headers });
}

function upsertRows(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const placeholders = rows.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
  const values = rows.flatMap(row => columns.map(col => row[col]));

  if (ID_TABLES.has(table)) {
    const setClause = columns.filter(c => c !== 'id').map(c => `"${c}" = excluded."${c}"`).join(', ');
    sqliteDb.prepare(`
      INSERT INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES ${placeholders}
      ON CONFLICT(id) DO UPDATE SET ${setClause}
    `).run(...values);
  } else if (JUNCTION_TABLES.has(table)) {
    sqliteDb.prepare(`
      INSERT OR IGNORE INTO "${table}" (${columns.map(c => `"${c}"`).join(', ')})
      VALUES ${placeholders}
    `).run(...values);
  }
}

async function pushPhase(
  target: SyncTarget,
  binderId: string,
  jobId: string,
  lastSyncedAt: string | null,
): Promise<void> {
  const job = await db.select().from(syncJobs).where(eq(syncJobs.id, jobId)).then(r => r[0]);
  if (!job) throw new Error('Sync job not found');

  let startIdx = job.currentTable ? SYNC_TABLES.indexOf(job.currentTable) : 0;
  if (startIdx < 0) startIdx = 0;

  for (let i = startIdx; i < SYNC_TABLES.length; i++) {
    const table = SYNC_TABLES[i];
    let offset = (table === job.currentTable && job.phase === 'push' ? (job.currentOffset ?? 0) : 0);

    await db.update(syncJobs).set({
      status: 'running',
      phase: 'push',
      currentTable: table,
      currentOffset: offset,
    }).where(eq(syncJobs.id, jobId));

    if (table === 'budget_binders') {
      const [binder] = sqliteDb.prepare(`
        SELECT * FROM budget_binders WHERE id = ?
      `).all(binderId) as Record<string, unknown>[];
      if (binder) {
        const res = await remoteFetch(target, '/api/sync/binder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ binder }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Failed to sync binder metadata: ${res.status} ${text}`);
        }
      }
      await db.update(syncJobs).set({
        syncedRecords: sql`${syncJobs.syncedRecords} + 1`,
      }).where(eq(syncJobs.id, jobId));
      continue;
    }

    if (JUNCTION_TABLES.has(table) && lastSyncedAt) {
      continue;
    }

    while (true) {
      const q = lastSyncedAt
        ? sqliteDb.prepare(`SELECT * FROM "${table}" WHERE binder_id = ? AND updated_at > ? ORDER BY rowid LIMIT ? OFFSET ?`)
        : sqliteDb.prepare(`SELECT * FROM "${table}" WHERE binder_id = ? ORDER BY rowid LIMIT ? OFFSET ?`);

      const rows = (lastSyncedAt
        ? q.all(binderId, lastSyncedAt, BATCH_SIZE, offset)
        : q.all(binderId, BATCH_SIZE, offset)) as Record<string, unknown>[];

      if (rows.length === 0) break;

      const res = await remoteFetch(target, `/api/sync/push/${binderId}?table=${table}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Push failed for ${table} at offset ${offset}: ${res.status} ${text}`);
      }

      offset += rows.length;
      await db.update(syncJobs).set({
        currentOffset: offset,
        syncedRecords: sql`${syncJobs.syncedRecords} + ${rows.length}`,
      }).where(eq(syncJobs.id, jobId));
    }
  }
}

async function pullPhase(
  target: SyncTarget,
  binderId: string,
  jobId: string,
  lastSyncedAt: string | null,
): Promise<void> {
  const job = await db.select().from(syncJobs).where(eq(syncJobs.id, jobId)).then(r => r[0]);
  if (!job) throw new Error('Sync job not found');

  let startIdx = job.currentTable && job.phase === 'pull' ? SYNC_TABLES.indexOf(job.currentTable) : 0;
  if (startIdx < 0) startIdx = 0;

  for (let i = startIdx; i < SYNC_TABLES.length; i++) {
    const table = SYNC_TABLES[i];
    let offset = (table === job.currentTable && job.phase === 'pull' ? (job.currentOffset ?? 0) : 0);

    await db.update(syncJobs).set({
      status: 'running',
      phase: 'pull',
      currentTable: table,
      currentOffset: offset,
    }).where(eq(syncJobs.id, jobId));

    if (JUNCTION_TABLES.has(table) && lastSyncedAt) {
      continue;
    }

    if (table === 'budget_binders') {
      const res = await remoteFetch(target, `/api/sync/pull/${binderId}?table=budget_binders&limit=1&offset=0`);
      if (res.ok) {
        const { rows } = await res.json() as { rows: Record<string, unknown>[] };
        if (rows && rows.length > 0) {
          upsertRows('budget_binders', rows);
        }
      }
      await db.update(syncJobs).set({
        syncedRecords: sql`${syncJobs.syncedRecords} + 1`,
      }).where(eq(syncJobs.id, jobId));
      continue;
    }

    while (true) {
      let url = `/api/sync/pull/${binderId}?table=${table}&limit=${BATCH_SIZE}&offset=${offset}`;
      if (lastSyncedAt) {
        url += `&since=${encodeURIComponent(lastSyncedAt)}`;
      }

      const res = await remoteFetch(target, url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Pull failed for ${table} at offset ${offset}: ${res.status} ${text}`);
      }

      const { rows } = await res.json() as { rows: Record<string, unknown>[] };
      if (!rows || rows.length === 0) break;

      upsertRows(table, rows);
      offset += rows.length;

      const pullPhase = table === 'transaction_attachments' ? 'pulling_attachments' : 'pull';
      await db.update(syncJobs).set({
        status: pullPhase,
        currentOffset: offset,
        syncedRecords: sql`${syncJobs.syncedRecords} + ${rows.length}`,
      }).where(eq(syncJobs.id, jobId));
    }
  }
}

async function syncAttachmentsPull(
  target: SyncTarget,
  binderId: string,
  jobId: string,
  lastSyncedAt: string | null,
): Promise<void> {
  const job = await db.select().from(syncJobs).where(eq(syncJobs.id, jobId)).then(r => r[0]);
  if (!job) throw new Error('Sync job not found');

  let offset = (job.phase === 'pulling_attachments' ? (job.currentOffset ?? 0) : 0);

  await db.update(syncJobs).set({
    status: 'running',
    phase: 'pulling_attachments',
    currentTable: 'transaction_attachments',
    currentOffset: offset,
  }).where(eq(syncJobs.id, jobId));

  while (true) {
    let url = `/api/sync/pull/${binderId}?table=transaction_attachments&limit=${BATCH_SIZE}&offset=${offset}`;
    if (lastSyncedAt) {
      url += `&since=${encodeURIComponent(lastSyncedAt)}`;
    }

    const res = await remoteFetch(target, url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Pull attachments failed at offset ${offset}: ${res.status} ${text}`);
    }

    const { rows: attachmentRows } = await res.json() as { rows: Record<string, unknown>[] };
    if (!attachmentRows || attachmentRows.length === 0) break;

    for (const att of attachmentRows) {
      const existing = sqliteDb.prepare(
        'SELECT id FROM transaction_attachments WHERE id = ?',
      ).get(att.id) as { id: string } | undefined;

      if (!existing) {
        try {
          const fileRes = await remoteFetch(target, `/api/sync/attachments/${binderId}/${att.id}`);
          if (fileRes.ok) {
            const buffer = Buffer.from(await fileRes.arrayBuffer());
            const { object_name, mime_type } = att as { object_name: string; mime_type?: string };
            await storage.uploadFile(object_name, buffer, mime_type || 'application/octet-stream');
          }
        } catch {
          // file might not exist, skip
        }
      }

      offset++;
      await db.update(syncJobs).set({
        currentOffset: offset,
        syncedRecords: sql`${syncJobs.syncedRecords} + 1`,
      }).where(eq(syncJobs.id, jobId));
    }
  }
}

export async function performSync(binderId: string, target: SyncTarget): Promise<void> {
  const [syncTarget] = await db.select().from(syncTargets)
    .where(eq(syncTargets.id, target.id))
    .limit(1);
  if (!syncTarget) throw new Error('Sync target not found');

  const lastSyncedAt = syncTarget.lastSyncedAt;

  await db.update(syncTargets).set({
    lastSyncStatus: 'syncing',
    lastError: null,
  }).where(eq(syncTargets.id, target.id));

  let jobId: string | null = null;

  try {
    const existingJob = await db.select().from(syncJobs)
      .where(sql`${syncJobs.targetId} = ${target.id} AND ${syncJobs.status} = 'running'`)
      .limit(1);

    if (existingJob.length > 0) {
      jobId = existingJob[0].id;
    } else {
      let totalRecords = 0;
      for (const table of SYNC_TABLES) {
        if (JUNCTION_TABLES.has(table) && lastSyncedAt) continue;
        if (table === 'budget_binders') {
          totalRecords += 1;
          continue;
        }
        const count = (
          lastSyncedAt
            ? sqliteDb.prepare(`SELECT COUNT(*) as count FROM "${table}" WHERE binder_id = ? AND updated_at > ?`)
            : sqliteDb.prepare(`SELECT COUNT(*) as count FROM "${table}" WHERE binder_id = ?`)
        ).get(binderId, ...(lastSyncedAt ? [lastSyncedAt] : [])) as { count: number };
        totalRecords += count.count + (table === 'transaction_attachments' ? count.count : 0);
      }

      const [newJob] = await db.insert(syncJobs).values({
        binderId,
        targetId: target.id,
        status: 'running',
        phase: 'push',
        totalRecords,
      }).returning();
      jobId = newJob.id;
    }

    await db.update(syncJobs).set({
      status: 'running',
      currentOffset: 0,
      currentTable: null,
      syncedRecords: 0,
      phase: 'push',
      error: null,
    }).where(eq(syncJobs.id, jobId));

    await pushPhase(target, binderId, jobId, lastSyncedAt);

    await db.update(syncJobs).set({
      phase: 'pull',
      currentOffset: 0,
      currentTable: null,
    }).where(eq(syncJobs.id, jobId));

    await pullPhase(target, binderId, jobId, lastSyncedAt);

    await db.update(syncJobs).set({
      phase: 'pulling_attachments',
      currentOffset: 0,
      currentTable: 'transaction_attachments',
    }).where(eq(syncJobs.id, jobId));

    await syncAttachmentsPull(target, binderId, jobId, lastSyncedAt);

    await db.update(syncJobs).set({
      status: 'completed',
      completedAt: new Date().toISOString(),
    }).where(eq(syncJobs.id, jobId));

    await db.update(syncTargets).set({
      lastSyncedAt: new Date().toISOString(),
      lastSyncStatus: 'completed',
      lastError: null,
    }).where(eq(syncTargets.id, target.id));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (jobId) {
      await db.update(syncJobs).set({
        status: 'failed',
        error: message,
        completedAt: new Date().toISOString(),
      }).where(eq(syncJobs.id, jobId));
    }
    await db.update(syncTargets).set({
      lastSyncStatus: 'failed',
      lastError: message,
    }).where(eq(syncTargets.id, target.id));
    throw err;
  }
}

export { remoteFetch, upsertRows };
