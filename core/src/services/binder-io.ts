import crypto from 'node:crypto';
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

function buildInsert(
  table: string,
  columns: string[],
  rows: Record<string, unknown>[],
): string | null {
  if (rows.length === 0) return null;
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const values = rows.map((row) => `(${columns.map((c) => fmt(row[c])).join(', ')})`).join(',\n');
  return `INSERT INTO ${table} (${cols}) VALUES\n${values};\n`;
}

function parseValuesIntoRows(valuesPart: string): string[] {
  const rows: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;

  for (let i = 0; i < valuesPart.length; i++) {
    const ch = valuesPart[i];
    if (inString) {
      current += ch;
      if (ch === "'" && i + 1 < valuesPart.length && valuesPart[i + 1] === "'") {
        current += "'";
        i++;
      } else if (ch === "'") {
        inString = false;
      }
      continue;
    }
    if (ch === "'") {
      current += ch;
      inString = true;
      continue;
    }
    if (ch === '(') {
      depth++;
      if (depth === 1) continue;
      current += ch;
      continue;
    }
    if (ch === ')') {
      depth--;
      if (depth === 0) {
        rows.push(current);
        current = '';
        continue;
      }
      current += ch;
      continue;
    }
    if (depth > 0) current += ch;
  }
  return rows;
}

function splitRowValues(row: string): string[] {
  const values: string[] = [];
  let current = '';
  let inString = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (inString) {
      current += ch;
      if (ch === "'" && i + 1 < row.length && row[i + 1] === "'") {
        current += "'";
        i++;
      } else if (ch === "'") inString = false;
      continue;
    }
    if (ch === "'") {
      current += ch;
      inString = true;
      continue;
    }
    if (ch === ',') {
      values.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) values.push(current.trim());
  return values;
}

function isUuid(val: string): boolean {
  return /^'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'$/i.test(val);
}

function extractUuid(val: string): string | null {
  const m = val.match(/^'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'$/i);
  return m ? m[1] : null;
}

function wrapUuid(uuid: string): string {
  return `'${uuid}'`;
}

export async function exportBinder(binderId: string): Promise<string> {
  const [binder] = await db
    .select({
      name: budgetBinders.name,
      description: budgetBinders.description,
      currency: budgetBinders.currency,
      createdAt: budgetBinders.createdAt,
    })
    .from(budgetBinders)
    .where(eq(budgetBinders.id, binderId));

  if (!binder) throw new Error('Binder not found');

  const accountsRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, name, type, created_at FROM accounts WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];
  const categoriesRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, name, created_at FROM categories WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];
  const tagsRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, name, color, created_at FROM tags WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];
  const payeesRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, name, created_at FROM payees WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];
  const allTxRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, account_id, payee_id, transfer_id, amount, date, notes, is_cleared, created_at FROM transactions WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];

  const transferPairs: { id: string; transferId: string }[] = [];
  const txRowsWithoutTransfer = allTxRows.map((r) => {
    const row = { ...r };
    if (row.transfer_id) {
      transferPairs.push({ id: String(row.id), transferId: String(row.transfer_id) });
    }
    delete row.transfer_id;
    return row;
  });

  const transactionTagsRows = sqliteDb
    .prepare('SELECT binder_id, transaction_id, tag_id FROM transaction_tags WHERE binder_id = ?')
    .all(binderId) as Record<string, unknown>[];
  const accountTagsRows = sqliteDb
    .prepare('SELECT binder_id, account_id, tag_id FROM account_tags WHERE binder_id = ?')
    .all(binderId) as Record<string, unknown>[];
  const accountCategoriesRows = sqliteDb
    .prepare(
      'SELECT binder_id, account_id, category_id FROM account_categories WHERE binder_id = ?',
    )
    .all(binderId) as Record<string, unknown>[];
  const paymentSchedulesRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, name, account_id, payee_id, amount, repeat_interval, repeat_type, start_date, end_type, end_date, end_occurrences, specific_days, weekend_adjustment, notify_before, notify_type, is_active, created_at FROM payment_schedules WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];
  const psoRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, schedule_id, due_date, transaction_id, paid_at, created_at FROM payment_schedule_occurrences WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];
  const investmentsRows = sqliteDb
    .prepare(
      'SELECT id, binder_id, account_id, principal_amount, interest_rate, interest_period, compounding_frequency, tax_rate, start_date, maturity_date, created_at FROM investments WHERE binder_id = ? ORDER BY created_at',
    )
    .all(binderId) as Record<string, unknown>[];

  const lines: string[] = [];
  lines.push('-- Midas Binder Export');
  lines.push(`-- Export Date: ${new Date().toISOString()}`);
  lines.push(`-- Binder: ${binder.name}`);
  lines.push(`-- Description: ${binder.description ?? ''}`);
  lines.push(`-- Currency: ${binder.currency}`);
  lines.push('-- Schema Version: 6');
  lines.push('');
  lines.push('BEGIN;');
  lines.push('');

  const inserts = [
    buildInsert('accounts', ['id', 'binder_id', 'name', 'type', 'created_at'], accountsRows),
    buildInsert('categories', ['id', 'binder_id', 'name', 'created_at'], categoriesRows),
    buildInsert('tags', ['id', 'binder_id', 'name', 'color', 'created_at'], tagsRows),
    buildInsert('payees', ['id', 'binder_id', 'name', 'created_at'], payeesRows),
    buildInsert(
      'transactions',
      [
        'id',
        'binder_id',
        'account_id',
        'payee_id',
        'amount',
        'date',
        'notes',
        'is_cleared',
        'created_at',
      ],
      txRowsWithoutTransfer,
    ),
  ];

  for (const insert of inserts) {
    if (insert) lines.push(insert);
  }

  for (const pair of transferPairs) {
    lines.push(
      `UPDATE transactions SET transfer_id = '${pair.transferId.replace(/'/g, "''")}' WHERE id = '${pair.id.replace(/'/g, "''")}';`,
    );
  }

  if (transferPairs.length > 0) lines.push('');

  const moreInserts = [
    buildInsert('transaction_tags', ['binder_id', 'transaction_id', 'tag_id'], transactionTagsRows),
    buildInsert('account_tags', ['binder_id', 'account_id', 'tag_id'], accountTagsRows),
    buildInsert(
      'account_categories',
      ['binder_id', 'account_id', 'category_id'],
      accountCategoriesRows,
    ),
    buildInsert(
      'payment_schedules',
      [
        'id',
        'binder_id',
        'name',
        'account_id',
        'payee_id',
        'amount',
        'repeat_interval',
        'repeat_type',
        'start_date',
        'end_type',
        'end_date',
        'end_occurrences',
        'specific_days',
        'weekend_adjustment',
        'notify_before',
        'notify_type',
        'is_active',
        'created_at',
      ],
      paymentSchedulesRows,
    ),
    buildInsert(
      'payment_schedule_occurrences',
      ['id', 'binder_id', 'schedule_id', 'due_date', 'transaction_id', 'paid_at', 'created_at'],
      psoRows,
    ),
    buildInsert(
      'investments',
      [
        'id',
        'binder_id',
        'account_id',
        'principal_amount',
        'interest_rate',
        'interest_period',
        'compounding_frequency',
        'tax_rate',
        'start_date',
        'maturity_date',
        'created_at',
      ],
      investmentsRows,
    ),
  ];

  for (const insert of moreInserts) {
    if (insert) lines.push(insert);
  }

  lines.push('COMMIT;');
  return lines.join('\n');
}

export async function importBinder(
  sqlContent: string,
  password: string,
  nameOverride?: string,
  descriptionOverride?: string,
  currencyOverride?: string,
): Promise<{ id: string; name: string; description: string | null; currency: string }> {
  const headerName = sqlContent.match(/^-- Binder: (.+)$/m)?.[1]?.trim();
  const headerDescription = sqlContent.match(/^-- Description: (.+)$/m)?.[1]?.trim();
  const headerCurrency = sqlContent.match(/^-- Currency: (.+)$/m)?.[1]?.trim();

  const newName = nameOverride || headerName || 'Imported Binder';
  const newDescription = descriptionOverride || headerDescription || null;
  const newCurrency = currencyOverride || headerCurrency || 'USD';

  const [existing] = await db
    .select({ id: budgetBinders.id })
    .from(budgetBinders)
    .where(sql`LOWER(${budgetBinders.name}) = LOWER(${newName})`)
    .limit(1);
  const finalName = existing ? `${newName} (Imported)` : newName;

  const newBinderId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);

  const sqlLines = sqlContent.split('\n').filter((l) => !l.trim().startsWith('--'));

  const oldBinderMatch = sqlContent.match(
    /binder_id[\s\S]*?VALUES\s*\([^)]*,\s*'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'/i,
  );
  const oldBinderId = oldBinderMatch?.[1];

  let dataSql = sqlLines.join('\n');
  dataSql = dataSql.replace(/^\s*BEGIN;\s*/im, '');
  dataSql = dataSql.replace(/\s*COMMIT;\s*$/im, '');
  dataSql = dataSql.replace(/SET session_replication_role\s*=\s*(replica|default)\s*;\s*/gi, '');

  const uuidMap = new Map<string, string>();
  if (oldBinderId) uuidMap.set(oldBinderId, newBinderId);

  const stmts = dataSql
    .split(';\n')
    .filter((s) => s.trim())
    .map((s) => s.trim() + ';');

  const ID_TABLES = new Set([
    'accounts',
    'categories',
    'tags',
    'payees',
    'transactions',
    'payment_schedules',
    'payment_schedule_occurrences',
    'investments',
  ]);

  for (const stmt of stmts) {
    const m = stmt.match(/^INSERT\s+INTO\s+"?(\w+)"?\s+\(([^)]+)\)\s+VALUES\s+([\s\S]*);$/i);
    if (!m) continue;
    const columns = m[2].split(',').map((c) => c.trim().replace(/"/g, ''));
    const idIndex = columns.indexOf('id');
    if (idIndex < 0 || !ID_TABLES.has(m[1])) continue;
    for (const rowText of parseValuesIntoRows(m[3].trim())) {
      const vals = splitRowValues(rowText);
      const oldId = extractUuid(vals[idIndex]);
      if (oldId && !uuidMap.has(oldId)) uuidMap.set(oldId, crypto.randomUUID());
    }
  }

  const rewrittenStmts = stmts.map((stmt) => {
    const insertMatch = stmt.match(
      /^INSERT\s+INTO\s+"?(\w+)"?\s+\(([^)]+)\)\s+VALUES\s+([\s\S]*);$/i,
    );
    if (insertMatch) {
      const table = insertMatch[1];
      const columns = insertMatch[2].split(',').map((c) => c.trim().replace(/"/g, ''));
      const valuesPart = insertMatch[3].trim();
      const rows = parseValuesIntoRows(valuesPart);
      const rewrittenRows = rows.map((rowText) => {
        const rowValues = splitRowValues(rowText);
        return `(${rowValues
          .map((val, i) => {
            const col = columns[i];
            if (col === 'id' && isUuid(val)) {
              const old = extractUuid(val);
              if (old && uuidMap.has(old)) return wrapUuid(uuidMap.get(old)!);
            }
            if (col.endsWith('_id') && isUuid(val)) {
              const old = extractUuid(val);
              if (old && uuidMap.has(old)) return wrapUuid(uuidMap.get(old)!);
            }
            return val;
          })
          .join(', ')})`;
      });
      const colStr = columns.map((c) => `"${c}"`).join(', ');
      return `INSERT INTO ${table} (${colStr}) VALUES\n${rewrittenRows.join(',\n')};`;
    }

    const updateMatch = stmt.match(
      /UPDATE\s+transactions\s+SET\s+transfer_id\s*=\s*'([^']+)'\s+WHERE\s+id\s*=\s*'([^']+)'/i,
    );
    if (updateMatch) {
      const newTransferId = uuidMap.get(updateMatch[1]) || updateMatch[1];
      const newId = uuidMap.get(updateMatch[2]) || updateMatch[2];
      return `UPDATE transactions SET transfer_id = '${newTransferId}' WHERE id = '${newId}';`;
    }

    return stmt;
  });

  const fullSql = [
    'BEGIN;',
    '',
    `INSERT INTO budget_binders (id, name, description, currency, password_hash, created_at)`,
    `VALUES (${fmt(newBinderId)}, ${fmt(finalName)}, ${fmt(newDescription)}, ${fmt(newCurrency)}, ${fmt(passwordHash)}, datetime('now'));`,
    '',
    ...rewrittenStmts,
    '',
    'COMMIT;',
  ].join('\n');

  try {
    const existsCheck = await db
      .select({ id: budgetBinders.id })
      .from(budgetBinders)
      .where(eq(budgetBinders.id, newBinderId))
      .limit(1);
    if (existsCheck.length > 0) throw new Error('Binder ID collision, please retry');
    sqliteDb.exec(fullSql);
  } catch (err: unknown) {
    await db
      .delete(budgetBinders)
      .where(eq(budgetBinders.id, newBinderId))
      .catch(() => {});
    throw err;
  }

  return { id: newBinderId, name: finalName, description: newDescription, currency: newCurrency };
}
