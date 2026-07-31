import type { Multipart } from '@fastify/multipart';
import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import initSqlJs from 'sql.js';
import { eq, sql } from 'drizzle-orm';
import { db, sqliteDb } from '../db/index.js';
import { budgetBinders } from '../db/schema.js';

function fmt(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  return `'${String(val)}'`;
}

function buildInsert(table: string, columns: string[], rows: Record<string, unknown>[]): string | null {
  if (rows.length === 0) return null;
  const cols = columns.map((c) => `"${c}"`).join(', ');
  const values = rows.map((row) => `(${columns.map((c) => fmt(row[c])).join(', ')})`).join(',\n');
  return `INSERT INTO ${table} (${cols}) VALUES\n${values};\n`;
}

function dateFromYyyyMmDd(d: number): string {
  const s = String(d);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

function toRows(result: { columns: string[]; values: unknown[][] }[]): Record<string, unknown>[] {
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

export async function importFromActual(fileBuffer: Buffer, password: string, nameOverride?: string, currencyOverride?: string): Promise<{ id: string; name: string; description: string; currency: string }> {
  const SQL = await initSqlJs();
  const actualDb = new SQL.Database(new Uint8Array(fileBuffer));

  const [accountsRes, payeesRes, payeeMappingRes, categoriesRes, categoryGroupsRes, categoryMappingRes, transactionsRes, notesRes] = [
    actualDb.exec('SELECT * FROM accounts WHERE tombstone = 0 AND closed = 0'),
    actualDb.exec('SELECT * FROM payees WHERE tombstone = 0'),
    actualDb.exec('SELECT * FROM payee_mapping'),
    actualDb.exec('SELECT * FROM categories WHERE tombstone = 0'),
    actualDb.exec('SELECT * FROM category_groups WHERE tombstone = 0'),
    actualDb.exec('SELECT * FROM category_mapping'),
    actualDb.exec('SELECT * FROM transactions WHERE tombstone = 0'),
    actualDb.exec('SELECT * FROM notes'),
  ];

  actualDb.close();

  const accounts = toRows(accountsRes);
  const payees = toRows(payeesRes);
  const payeeMappingRows = toRows(payeeMappingRes);
  const categories = toRows(categoriesRes);
  const categoryMappingRows = toRows(categoryMappingRes);
  const allTransactions = toRows(transactionsRes);
  const noteRows = toRows(notesRes);

  const payeeMapping = new Map<string, string>();
  for (const pm of payeeMappingRows) { payeeMapping.set(pm.id as string, pm.targetId as string); }

  const categoryMapping = new Map<string, string>();
  for (const cm of categoryMappingRows) { categoryMapping.set(cm.id as string, cm.transferId as string); }

  const transferPayeeIds = new Set<string>();
  for (const p of payees) {
    const ta = p.transfer_acct;
    if (ta && String(ta).trim()) transferPayeeIds.add(p.id as string);
  }

  const budgetName = nameOverride || 'Imported from Actual Budget';
  const [existing] = await db.select({ id: budgetBinders.id }).from(budgetBinders).where(sql`LOWER(${budgetBinders.name}) = LOWER(${budgetName})`).limit(1);
  const finalName = existing ? `${budgetName} (Imported)` : budgetName;
  const newBinderId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 10);
  const newCurrency = currencyOverride || 'USD';

  const accountIdMap = new Map<string, string>();
  for (const a of accounts) { accountIdMap.set(a.id as string, crypto.randomUUID()); }

  const categoryIdMap = new Map<string, string>();
  const categoryToTagIdMap = new Map<string, string>();
  for (const c of categories) {
    const catId = crypto.randomUUID();
    categoryIdMap.set(c.id as string, catId);
    categoryToTagIdMap.set(c.id as string, crypto.randomUUID());
  }

  const nonTransferPayees = payees.filter((p) => !transferPayeeIds.has(p.id as string));
  const payeeIdMap = new Map<string, string>();
  for (const p of nonTransferPayees) { payeeIdMap.set(p.id as string, crypto.randomUUID()); }

  const transactions = allTransactions.filter((tx) => !tx.isChild);
  const transactionIdMap = new Map<string, string>();
  for (const tx of transactions) { transactionIdMap.set(tx.id as string, crypto.randomUUID()); }

  const lines: string[] = [];
  lines.push('BEGIN;');
  lines.push('');
  lines.push(`INSERT INTO budget_binders (id, name, description, currency, password_hash, created_at) VALUES (${fmt(newBinderId)}, ${fmt(finalName)}, NULL, ${fmt(newCurrency)}, ${fmt(passwordHash)}, datetime('now'));`);
  lines.push('');

  if (accounts.length > 0) {
    const accountRows = accounts.map((a) => ({ id: accountIdMap.get(a.id as string), binder_id: newBinderId, name: a.name as string, type: 'checking' }));
    const insert = buildInsert('accounts', ['id', 'binder_id', 'name', 'type'], accountRows);
    if (insert) lines.push(insert);
  }

  if (categories.length > 0) {
    const catRows = categories.map((c) => ({ id: categoryIdMap.get(c.id as string), binder_id: newBinderId, name: c.name as string }));
    const insert = buildInsert('categories', ['id', 'binder_id', 'name'], catRows);
    if (insert) lines.push(insert);
  }

  if (categories.length > 0) {
    const tagRows = categories.map((c) => ({ id: categoryToTagIdMap.get(c.id as string), binder_id: newBinderId, name: c.name as string }));
    const insert = buildInsert('tags', ['id', 'binder_id', 'name'], tagRows);
    if (insert) lines.push(insert);
  }

  if (nonTransferPayees.length > 0) {
    const payeeRows = nonTransferPayees.map((p) => ({ id: payeeIdMap.get(p.id as string), binder_id: newBinderId, name: p.name as string }));
    const insert = buildInsert('payees', ['id', 'binder_id', 'name'], payeeRows);
    if (insert) lines.push(insert);
  }

  lines.push('COMMIT;');
  sqliteDb.exec(lines.join('\n'));

  return { id: newBinderId, name: finalName, description: 'Imported from Actual Budget', currency: newCurrency };
}
