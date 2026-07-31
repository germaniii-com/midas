import { eq, sql } from 'drizzle-orm';
import { db, sqliteDb } from '../db/index.js';
import { budgetBinders } from '../db/schema.js';
import bcrypt from 'bcrypt';

function fmt(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val)}'`;
}

export interface RemoteBinder {
  id: string;
  name: string;
  description: string | null;
  currency: string;
}

export async function listRemoteBinders(host: string, password: string): Promise<RemoteBinder[]> {
  const normalizedHost = host.replace(/\/+$/, '');
  const res = await fetch(`${normalizedHost}/api/sync/binders`, {
    headers: { 'x-sync-password': password },
    signal: AbortSignal.timeout(10000),
  });

  if (res.status === 401) throw new Error('Invalid server password');
  if (!res.ok) throw new Error('Remote server returned an error');

  return (await res.json()) as RemoteBinder[];
}

export async function pullRemoteBinder(
  host: string,
  serverPassword: string,
  binderId: string,
  binderName: string,
  password: string,
): Promise<RemoteBinder> {
  const normalizedHost = host.replace(/\/+$/, '');

  const loginRes = await fetch(`${normalizedHost}/api/binders/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: binderName, password }),
    signal: AbortSignal.timeout(10000),
  });

  if (!loginRes.ok) throw new Error('Invalid binder password');

  const loginResult = (await loginRes.json()) as { id: string };
  if (loginResult.id !== binderId) throw new Error('Binder mismatch on remote server');

  const exportRes = await fetch(`${normalizedHost}/api/binders/${binderId}/export`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!exportRes.ok) throw new Error('Failed to fetch binder export from remote');

  const exportSql = await exportRes.text();
  return importBinderPreservingUuids(exportSql, password, binderName);
}

async function importBinderPreservingUuids(
  sqlContent: string,
  password: string,
  expectedName: string,
): Promise<RemoteBinder> {
  const headerName = sqlContent.match(/^-- Binder: (.+)$/m)?.[1]?.trim();
  const headerDescription = sqlContent.match(/^-- Description: (.+)$/m)?.[1]?.trim();
  const headerCurrency = sqlContent.match(/^-- Currency: (.+)$/m)?.[1]?.trim();

  const finalName = expectedName || headerName || 'Imported Binder';
  const newDescription = headerDescription || null;
  const newCurrency = headerCurrency || 'USD';

  const originalBinderId = sqlContent.match(
    /binder_id[\s\S]*?VALUES\s*\([^)]*,\s*'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'/i,
  )?.[1];
  if (!originalBinderId) throw new Error('Could not determine binder ID from export');

  const [existingById] = await db
    .select({ id: budgetBinders.id })
    .from(budgetBinders)
    .where(eq(budgetBinders.id, originalBinderId))
    .limit(1);
  if (existingById) throw new Error('This binder already exists locally');

  const [existingByName] = await db
    .select({ id: budgetBinders.id })
    .from(budgetBinders)
    .where(sql`LOWER(${budgetBinders.name}) = LOWER(${finalName})`)
    .limit(1);
  const displayName = existingByName ? `${finalName} (Imported)` : finalName;

  const passwordHash = await bcrypt.hash(password, 10);

  const sqlLines = sqlContent.split('\n').filter((l) => !l.trim().startsWith('--'));
  let dataSql = sqlLines.join('\n');
  dataSql = dataSql.replace(/^\s*BEGIN;\s*/im, '');
  dataSql = dataSql.replace(/\s*COMMIT;\s*$/im, '');
  dataSql = dataSql.trim();

  const fullSql = [
    'BEGIN;',
    `INSERT INTO budget_binders (id, name, description, currency, password_hash, created_at, updated_at) VALUES (${fmt(originalBinderId)}, ${fmt(displayName)}, ${newDescription ? fmt(newDescription) : 'NULL'}, ${fmt(newCurrency)}, ${fmt(passwordHash)}, datetime('now'), datetime('now'));`,
    '',
    dataSql,
    '',
    'COMMIT;',
  ].join('\n');

  sqliteDb.exec(fullSql);

  return {
    id: originalBinderId,
    name: displayName,
    description: newDescription,
    currency: newCurrency,
  };
}
