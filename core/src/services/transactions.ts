import { eq, and, sql, inArray, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../db/index.js';
import { transactions, accounts, payees, tags, transactionTags, accountCategories, transactionAttachments } from '../db/schema.js';
import { storage } from '../storage/index.js';

export interface Transaction {
  id: string;
  binderId: string;
  accountId: string;
  payeeId: string | null;
  transferId: string | null;
  amount: string;
  date: string;
  notes: string | null;
  isCleared: boolean;
  createdAt: string;
}

export interface TransactionWithDetails extends Transaction {
  accountName: string | null;
  payeeName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  tags: { id: string; name: string; color: string | null }[];
  attachmentCount?: number;
  attachments?: { id: string; fileName: string; mimeType: string; fileSize: number; createdAt: string }[];
}

export interface CreateTransactionInput {
  accountId: string;
  amount: string;
  date: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export interface UpdateTransactionInput {
  accountId?: string;
  amount?: string;
  date?: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export interface ListTransactionsFilters {
  accountId?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

function flipAmount(amount: string): string {
  return amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
}

export async function listTransactions(binderId: string, filters: ListTransactionsFilters = {}): Promise<{ transactions: TransactionWithDetails[]; totalAmount: string }> {
  const { accountId, categoryId, limit: limitParam = 50, offset: offsetParam = 0 } = filters;
  const limit = Math.min(Math.max(limitParam, 1), 500);
  const offset = Math.max(offsetParam, 0);

  const whereConditions = [eq(transactions.binderId, binderId)];
  if (accountId) whereConditions.push(eq(transactions.accountId, accountId));
  if (categoryId) {
    const catAccountRows = await db
      .select({ accountId: accountCategories.accountId })
      .from(accountCategories)
      .where(eq(accountCategories.categoryId, categoryId));
    if (catAccountRows.length === 0) return { transactions: [], totalAmount: '0' };
    whereConditions.push(inArray(transactions.accountId, catAccountRows.map((r) => r.accountId)));
  }

  const counterpartTx = alias(transactions, 'counterpart_tx');
  const transferAccount = alias(accounts, 'transfer_account');

  const [totalRow] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${transactions.amount} AS REAL)), 0)`,
    })
    .from(transactions)
    .where(and(...whereConditions));

  const totalAmount = totalRow?.total || '0';

  const rows = await db
    .select({
      id: transactions.id,
      binderId: transactions.binderId,
      accountId: transactions.accountId,
      accountName: accounts.name,
      payeeId: transactions.payeeId,
      payeeName: payees.name,
      amount: transactions.amount,
      date: transactions.date,
      notes: transactions.notes,
      isCleared: transactions.isCleared,
      createdAt: transactions.createdAt,
      transferId: transactions.transferId,
      transferAccountId: counterpartTx.accountId,
      transferAccountName: transferAccount.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(payees, eq(transactions.payeeId, payees.id))
    .leftJoin(counterpartTx, eq(transactions.transferId, counterpartTx.id))
    .leftJoin(transferAccount, eq(counterpartTx.accountId, transferAccount.id))
    .where(and(...whereConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(sql`${transactions.date} DESC, ${transactions.createdAt} DESC`);

  if (rows.length === 0) return { transactions: [], totalAmount };

  const txIds = rows.map((r) => r.id);

  const attachmentCountRows = await db
    .select({
      transactionId: transactionAttachments.transactionId,
      count: count(),
    })
    .from(transactionAttachments)
    .where(inArray(transactionAttachments.transactionId, txIds))
    .groupBy(transactionAttachments.transactionId);

  const attachmentCountByTxId: Record<string, number> = {};
  for (const acr of attachmentCountRows) {
    attachmentCountByTxId[acr.transactionId] = acr.count;
  }

  const tagRows = await db
    .select({
      transactionId: transactionTags.transactionId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(inArray(transactionTags.transactionId, txIds));

  const tagsByTxId: Record<string, { id: string; name: string; color: string | null }[]> = {};
  for (const tr of tagRows) {
    if (!tagsByTxId[tr.transactionId]) tagsByTxId[tr.transactionId] = [];
    tagsByTxId[tr.transactionId].push({ id: tr.id, name: tr.name, color: tr.color });
  }

  const transactions_result = rows.map((r) => ({
    ...r,
    tags: tagsByTxId[r.id] || [],
    attachmentCount: attachmentCountByTxId[r.id] || 0,
  }));

  return { transactions: transactions_result, totalAmount };
}

export async function getTransaction(binderId: string, transactionId: string): Promise<TransactionWithDetails | null> {
  const counterpartTx = alias(transactions, 'counterpart_tx');
  const transferAccount = alias(accounts, 'transfer_account');

  const [tx] = await db
    .select({
      id: transactions.id,
      binderId: transactions.binderId,
      accountId: transactions.accountId,
      accountName: accounts.name,
      payeeId: transactions.payeeId,
      payeeName: payees.name,
      amount: transactions.amount,
      date: transactions.date,
      notes: transactions.notes,
      isCleared: transactions.isCleared,
      createdAt: transactions.createdAt,
      transferId: transactions.transferId,
      transferAccountId: counterpartTx.accountId,
      transferAccountName: transferAccount.name,
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(payees, eq(transactions.payeeId, payees.id))
    .leftJoin(counterpartTx, eq(transactions.transferId, counterpartTx.id))
    .leftJoin(transferAccount, eq(counterpartTx.accountId, transferAccount.id))
    .where(and(eq(transactions.id, transactionId), eq(transactions.binderId, binderId)));

  if (!tx) return null;

  const tagList = await db
    .select({ id: tags.id, name: tags.name, color: tags.color })
    .from(transactionTags)
    .innerJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(eq(transactionTags.transactionId, transactionId));

  const attachmentList = await db
    .select({
      id: transactionAttachments.id,
      fileName: transactionAttachments.fileName,
      mimeType: transactionAttachments.mimeType,
      fileSize: transactionAttachments.fileSize,
      createdAt: transactionAttachments.createdAt,
    })
    .from(transactionAttachments)
    .where(eq(transactionAttachments.transactionId, transactionId))
    .orderBy(transactionAttachments.createdAt);

  return { ...tx, tags: tagList, attachments: attachmentList };
}

export async function createTransaction(binderId: string, input: CreateTransactionInput): Promise<TransactionWithDetails> {
  const { accountId, amount, date, payeeId, transferAccountId, notes, isCleared, tagIds } = input;

  if (!accountId) throw new Error('Account is required');
  if (amount === undefined || amount === null) throw new Error('Amount is required');
  if (!date) throw new Error('Date is required');

  const [tx] = await db
    .insert(transactions)
    .values({
      binderId,
      accountId,
      amount,
      date,
      payeeId: payeeId ?? null,
      transferId: null,
      notes: notes ?? null,
      isCleared: isCleared ?? true,
    })
    .returning();

  if (transferAccountId) {
    const counterpartAmount = flipAmount(amount);
    const [counterpart] = await db
      .insert(transactions)
      .values({
        binderId,
        accountId: transferAccountId,
        amount: counterpartAmount,
        date,
        payeeId: null,
        transferId: null,
        isCleared: isCleared ?? true,
      })
      .returning();

    await db
      .update(transactions)
      .set({ transferId: counterpart.id })
      .where(eq(transactions.id, tx.id));

    tx.transferId = counterpart.id;
  }

  if (tagIds && tagIds.length > 0) {
    await db.insert(transactionTags).values(
      tagIds.map((tagId) => ({
        binderId,
        transactionId: tx.id,
        tagId,
      })),
    );
  }

  const tagList = tagIds && tagIds.length > 0
    ? await db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(tags)
        .where(inArray(tags.id, tagIds))
    : [];

  const [account] = await db
    .select({ name: accounts.name })
    .from(accounts)
    .where(eq(accounts.id, accountId));

  const [payee] = payeeId
    ? await db.select({ name: payees.name }).from(payees).where(eq(payees.id, payeeId))
    : [null];

  return {
    ...tx,
    accountName: account?.name ?? null,
    payeeName: payee?.name ?? null,
    transferAccountId: null,
    transferAccountName: null,
    tags: tagList,
  };
}

export async function updateTransaction(binderId: string, transactionId: string, input: UpdateTransactionInput): Promise<TransactionWithDetails> {
  const { accountId, amount, date, payeeId, transferAccountId, notes, isCleared, tagIds } = input;

  const [oldTx] = await db
    .select({
      id: transactions.id,
      transferId: transactions.transferId,
      amount: transactions.amount,
      date: transactions.date,
      isCleared: transactions.isCleared,
    })
    .from(transactions)
    .where(eq(transactions.id, transactionId))
    .limit(1);

  if (!oldTx) throw new Error('Transaction not found');

  const updates: Partial<typeof transactions.$inferInsert> = {};
  if (accountId !== undefined) updates.accountId = accountId;
  if (amount !== undefined) updates.amount = amount;
  if (date !== undefined) updates.date = date;
  if (payeeId !== undefined) updates.payeeId = payeeId;
  if (notes !== undefined) updates.notes = notes;
  if (isCleared !== undefined) updates.isCleared = isCleared;

  const hadTransfer = oldTx.transferId !== null;
  const wantsTransfer = transferAccountId !== undefined && transferAccountId !== null;

  if (hadTransfer && !wantsTransfer) {
    await db.delete(transactionTags).where(eq(transactionTags.transactionId, oldTx.transferId!));
    await db.delete(transactions).where(eq(transactions.id, oldTx.transferId!));
    updates.transferId = null;
  } else if (wantsTransfer && !hadTransfer) {
    const counterpartAmount = flipAmount(amount ?? oldTx.amount);
    const [counterpart] = await db
      .insert(transactions)
      .values({
        binderId,
        accountId: transferAccountId,
        amount: counterpartAmount,
        date: date ?? oldTx.date,
        payeeId: null,
        transferId: null,
        isCleared: isCleared ?? true,
      })
      .returning();
    updates.transferId = counterpart.id;
  } else if (hadTransfer && wantsTransfer) {
    const [counterpart] = await db
      .select({ accountId: transactions.accountId })
      .from(transactions)
      .where(eq(transactions.id, oldTx.transferId!))
      .limit(1);

    if (counterpart && counterpart.accountId !== transferAccountId) {
      await db.delete(transactionTags).where(eq(transactionTags.transactionId, oldTx.transferId!));
      await db.delete(transactions).where(eq(transactions.id, oldTx.transferId!));

      const counterpartAmount = flipAmount(amount ?? oldTx.amount);
      const [newCounterpart] = await db
        .insert(transactions)
        .values({
          binderId,
          accountId: transferAccountId,
          amount: counterpartAmount,
          date: date ?? oldTx.date,
          payeeId: null,
          transferId: null,
          isCleared: isCleared ?? true,
        })
        .returning();
      updates.transferId = newCounterpart.id;
    } else {
      const counterpartUpdates: Partial<typeof transactions.$inferInsert> = {};
      if (amount !== undefined) counterpartUpdates.amount = flipAmount(amount);
      if (date !== undefined) counterpartUpdates.date = date;
      if (isCleared !== undefined) counterpartUpdates.isCleared = isCleared;

      if (Object.keys(counterpartUpdates).length > 0) {
        await db
          .update(transactions)
          .set(counterpartUpdates)
          .where(eq(transactions.id, oldTx.transferId!));
      }
    }
  }

  const [tx] = await db
    .update(transactions)
    .set(updates)
    .where(eq(transactions.id, transactionId))
    .returning();

  if (!tx) throw new Error('Transaction not found');

  if (tagIds !== undefined) {
    await db.delete(transactionTags).where(eq(transactionTags.transactionId, transactionId));

    if (tagIds.length > 0) {
      await db.insert(transactionTags).values(
        tagIds.map((tagId) => ({
          binderId,
          transactionId,
          tagId,
        })),
      );
    }
  }

  const tagList = tagIds && tagIds.length > 0
    ? await db
        .select({ id: tags.id, name: tags.name, color: tags.color })
        .from(tags)
        .where(inArray(tags.id, tagIds))
    : [];

  return getTransaction(binderId, transactionId) as Promise<TransactionWithDetails>;
}

export async function deleteTransaction(binderId: string, transactionId: string): Promise<void> {
  const [existing] = await db
    .select({ transferId: transactions.transferId })
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.binderId, binderId)))
    .limit(1);

  if (!existing) throw new Error('Transaction not found');

  const txIdsToDelete = [transactionId];
  if (existing.transferId) {
    txIdsToDelete.push(existing.transferId);
  }

  const attachmentRows = await db
    .select({ objectName: transactionAttachments.objectName })
    .from(transactionAttachments)
    .where(inArray(transactionAttachments.transactionId, txIdsToDelete));

  for (const att of attachmentRows) {
    await storage.deleteFile(att.objectName).catch(() => {});
  }

  await db.delete(transactionTags).where(inArray(transactionTags.transactionId, txIdsToDelete));
  await db.delete(transactionAttachments).where(inArray(transactionAttachments.transactionId, txIdsToDelete));
  await db.delete(transactions).where(inArray(transactions.id, txIdsToDelete));
}
