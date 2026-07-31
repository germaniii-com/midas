import { eq, and, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { accounts, categories, accountCategories, transactions } from '../db/schema.js';

export interface Account {
  id: string;
  binderId: string;
  name: string;
  type: string;
  createdAt: string;
}

export interface AccountWithBalance extends Account {
  balance: string;
  categories: { id: string; name: string }[];
}

export interface CreateAccountInput {
  name: string;
  type: string;
  categoryIds?: string[];
}

export interface UpdateAccountInput {
  name?: string;
  type?: string;
  categoryIds?: string[];
}

export async function listAccounts(binderId: string): Promise<AccountWithBalance[]> {
  const accountList = await db
    .select({
      id: accounts.id,
      binderId: accounts.binderId,
      name: accounts.name,
      type: accounts.type,
      createdAt: accounts.createdAt,
      balance:
        sql<string>`COALESCE((SELECT SUM(amount) FROM transactions WHERE transactions.account_id = accounts.id), 0)`,
    })
    .from(accounts)
    .where(eq(accounts.binderId, binderId))
    .orderBy(accounts.name);

  if (accountList.length === 0) return [];

  const accountIds = accountList.map((a) => a.id);
  const categoryRows = await db
    .select({
      accountId: accountCategories.accountId,
      id: categories.id,
      name: categories.name,
    })
    .from(accountCategories)
    .innerJoin(categories, eq(accountCategories.categoryId, categories.id))
    .where(inArray(accountCategories.accountId, accountIds));

  const categoriesByAccountId: Record<string, { id: string; name: string }[]> = {};
  for (const cr of categoryRows) {
    if (!categoriesByAccountId[cr.accountId]) categoriesByAccountId[cr.accountId] = [];
    categoriesByAccountId[cr.accountId].push({ id: cr.id, name: cr.name });
  }

  return accountList.map((a) => ({
    ...a,
    categories: categoriesByAccountId[a.id] || [],
  }));
}

export async function getAccount(binderId: string, accountId: string): Promise<AccountWithBalance | null> {
  const [account] = await db
    .select({
      id: accounts.id,
      binderId: accounts.binderId,
      name: accounts.name,
      type: accounts.type,
      createdAt: accounts.createdAt,
      balance:
        sql<string>`COALESCE((SELECT SUM(amount) FROM transactions WHERE transactions.account_id = accounts.id), 0)`,
    })
    .from(accounts)
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.binderId, binderId),
      ),
    );

  if (!account) return null;

  const categoryList = await db
    .select({ id: categories.id, name: categories.name })
    .from(accountCategories)
    .innerJoin(categories, eq(accountCategories.categoryId, categories.id))
    .where(eq(accountCategories.accountId, account.id));

  return { ...account, categories: categoryList };
}

export async function createAccount(binderId: string, input: CreateAccountInput): Promise<AccountWithBalance> {
  const { name, type, categoryIds } = input;

  if (!name?.trim()) throw new Error('Name is required');
  if (!type?.trim()) throw new Error('Type is required');

  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.binderId, binderId),
        sql`LOWER(${accounts.name}) = LOWER(${name.trim()})`,
      ),
    )
    .limit(1);

  if (existing) {
    throw new Error('An account with this name already exists in this binder');
  }

  const [account] = await db
    .insert(accounts)
    .values({
      binderId,
      name: name.trim(),
      type,
    })
    .returning();

  if (categoryIds && categoryIds.length > 0) {
    await db.insert(accountCategories).values(
      categoryIds.map((categoryId) => ({
        binderId,
        accountId: account.id,
        categoryId,
      })),
    );
  }

  const categoryList = categoryIds && categoryIds.length > 0
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(inArray(categories.id, categoryIds))
    : [];

  return {
    ...account,
    balance: '0',
    categories: categoryList,
  };
}

export async function updateAccount(binderId: string, accountId: string, input: UpdateAccountInput): Promise<AccountWithBalance> {
  const { name, type, categoryIds } = input;

  if (name !== undefined && !name.trim()) {
    throw new Error('Name cannot be empty');
  }

  if (name !== undefined) {
    const [existing] = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(
        and(
          eq(accounts.binderId, binderId),
          sql`LOWER(${accounts.name}) = LOWER(${name.trim()})`,
          sql`${accounts.id} != ${accountId}`,
        ),
      )
      .limit(1);

    if (existing) {
      throw new Error('An account with this name already exists in this binder');
    }
  }

  const updates: Partial<typeof accounts.$inferInsert> = {};
  if (name !== undefined) updates.name = name.trim();
  if (type !== undefined) updates.type = type;

  const [account] = await db
    .update(accounts)
    .set(updates)
    .where(eq(accounts.id, accountId))
    .returning();

  if (!account) {
    throw new Error('Account not found');
  }

  if (categoryIds !== undefined) {
    await db
      .delete(accountCategories)
      .where(eq(accountCategories.accountId, accountId));

    if (categoryIds.length > 0) {
      await db.insert(accountCategories).values(
        categoryIds.map((categoryId) => ({
          binderId,
          accountId,
          categoryId,
        })),
      );
    }
  }

  const categoryList = categoryIds && categoryIds.length > 0
    ? await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .where(inArray(categories.id, categoryIds))
    : [];

  const [balanceRow] = await db
    .select({
      balance: sql<string>`COALESCE((SELECT SUM(amount) FROM transactions WHERE transactions.account_id = ${accountId}), 0)`,
    })
    .from(accounts)
    .where(eq(accounts.id, accountId));

  return {
    ...account,
    balance: balanceRow?.balance || '0',
    categories: categoryList,
  };
}

export async function deleteAccount(binderId: string, accountId: string): Promise<void> {
  const [account] = await db
    .delete(accounts)
    .where(
      and(
        eq(accounts.id, accountId),
        eq(accounts.binderId, binderId),
      ),
    )
    .returning({ id: accounts.id });

  if (!account) {
    throw new Error('Account not found');
  }
}
