import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { eq, sql } from 'drizzle-orm';
import { db, sqliteDb } from '../db';
import { budgetBinders } from '../db/schema';

function fmt(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val)}'`;
}

export async function remoteRoutes(app: FastifyInstance) {
  app.post('/remote/list-binders', async (req, reply) => {
    const { host, password } = req.body as { host: string; password: string };

    if (!host || !password) {
      return reply.status(400).send({ error: 'Host and server password are required' });
    }

    const normalizedHost = host.replace(/\/+$/, '');

    try {
      const res = await fetch(`${normalizedHost}/api/sync/binders`, {
        headers: { 'x-sync-password': password },
        signal: AbortSignal.timeout(10000),
      });

      if (res.status === 401) {
        return reply.status(401).send({ error: 'Invalid server password' });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return reply.status(502).send({ error: text || 'Remote server returned an error' });
      }

      const binders = await res.json();
      return reply.send({ binders });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        return reply.status(502).send({ error: 'Connection to remote server timed out' });
      }
      return reply.status(502).send({ error: 'Could not connect to remote server. Check the host and ensure the server is running.' });
    }
  });

  app.post('/remote/pull-binder', async (req, reply) => {
    const { host, serverPassword, binderId, binderName, password } = req.body as {
      host: string;
      serverPassword: string;
      binderId: string;
      binderName: string;
      password: string;
    };

    if (!host || !serverPassword || !binderId || !binderName || !password) {
      return reply.status(400).send({ error: 'All fields are required' });
    }

    const normalizedHost = host.replace(/\/+$/, '');

    try {
      const loginRes = await fetch(`${normalizedHost}/api/binders/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: binderName, password }),
        signal: AbortSignal.timeout(10000),
      });

      if (!loginRes.ok) {
        return reply.status(401).send({ error: 'Invalid binder password' });
      }

      const loginResult = await loginRes.json();
      if (loginResult.id !== binderId) {
        return reply.status(400).send({ error: 'Binder mismatch on remote server' });
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        return reply.status(502).send({ error: 'Connection to remote server timed out' });
      }
      return reply.status(502).send({ error: 'Could not connect to remote server' });
    }

    let exportSql: string;
    try {
      const exportRes = await fetch(`${normalizedHost}/api/binders/${binderId}/export`, {
        signal: AbortSignal.timeout(30000),
      });

      if (!exportRes.ok) {
        return reply.status(502).send({ error: 'Failed to fetch binder export from remote' });
      }

      exportSql = await exportRes.text();
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        return reply.status(502).send({ error: 'Export download timed out' });
      }
      return reply.status(502).send({ error: 'Could not connect to remote server' });
    }

    try {
      const result = await importBinderPreservingUuids(exportSql, password, binderName);
      return reply.status(201).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import binder';
      return reply.status(400).send({ error: message });
    }
  });
}

async function importBinderPreservingUuids(
  sqlContent: string,
  password: string,
  expectedName: string,
): Promise<{ id: string; name: string; description: string | null; currency: string }> {
  const headerName = sqlContent.match(/^-- Binder: (.+)$/m)?.[1]?.trim();
  const headerDescription = sqlContent.match(/^-- Description: (.+)$/m)?.[1]?.trim();
  const headerCurrency = sqlContent.match(/^-- Currency: (.+)$/m)?.[1]?.trim();

  const finalName = expectedName || headerName || 'Imported Binder';
  const newDescription = headerDescription || null;
  const newCurrency = headerCurrency || 'USD';

  const originalBinderId = sqlContent.match(
    /binder_id[\s\S]*?VALUES\s*\([^)]*,\s*'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'/i,
  )?.[1];

  if (!originalBinderId) {
    throw new Error('Could not determine binder ID from export');
  }

  const [existingById] = await db
    .select({ id: budgetBinders.id })
    .from(budgetBinders)
    .where(eq(budgetBinders.id, originalBinderId))
    .limit(1);
  if (existingById) {
    throw new Error('This binder already exists locally');
  }

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
    `INSERT INTO budget_binders (id, name, description, currency, password_hash, created_at, updated_at)`,
    `VALUES (${fmt(originalBinderId)}, ${fmt(displayName)}, ${newDescription ? fmt(newDescription) : 'NULL'}, ${fmt(newCurrency)}, ${fmt(passwordHash)}, datetime('now'), datetime('now'));`,
    '',
    dataSql,
    '',
    'COMMIT;',
  ].join('\n');

  try {
    sqliteDb.exec(fullSql);
  } catch (err) {
    await db.delete(budgetBinders).where(eq(budgetBinders.id, originalBinderId)).catch(() => {});
    throw err;
  }

  return {
    id: originalBinderId,
    name: displayName,
    description: newDescription,
    currency: newCurrency,
  };
}
