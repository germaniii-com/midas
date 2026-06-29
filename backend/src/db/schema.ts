import crypto from 'node:crypto';
import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  unique,
  foreignKey,
} from 'drizzle-orm/sqlite-core';

export const budgetBinders = sqliteTable('budget_binders', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull().unique(),
  description: text('description'),
  currency: text('currency').default('USD'),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const payees = sqliteTable('payees', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  color: text('color').default('#3B82F6'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const accountTags = sqliteTable(
  'account_tags',
  {
    binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.accountId, table.tagId] }),
  }),
);

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const accountCategories = sqliteTable(
  'account_categories',
  {
    binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').notNull().references(() => categories.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.accountId, table.categoryId] }),
  }),
);

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
    payeeId: text('payee_id').references(() => payees.id, { onDelete: 'set null' }),
    transferId: text('transfer_id'),
    amount: text('amount').notNull(),
    date: text('date').notNull(),
    notes: text('notes'),
    isCleared: integer('is_cleared', { mode: 'boolean' }).default(false),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    transferFk: foreignKey({
      columns: [table.transferId],
      foreignColumns: [table.id],
    }).onDelete('set null'),
  }),
);

export const transactionTags = sqliteTable(
  'transaction_tags',
  {
    binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
    transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
    tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.transactionId, table.tagId] }),
  }),
);

export const paymentSchedules = sqliteTable('payment_schedules', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  payeeId: text('payee_id').references(() => payees.id, { onDelete: 'set null' }),
  amount: text('amount').notNull(),
  repeatInterval: integer('repeat_interval').notNull().default(1),
  repeatType: text('repeat_type').notNull(),
  startDate: text('start_date').notNull(),
  endType: text('end_type').notNull().default('never'),
  endDate: text('end_date'),
  endOccurrences: integer('end_occurrences'),
  specificDays: text('specific_days', { mode: 'json' }),
  weekendAdjustment: text('weekend_adjustment').notNull().default('none'),
  notifyBefore: integer('notify_before').notNull().default(7),
  notifyType: text('notify_type').default('days'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const paymentScheduleOccurrences = sqliteTable(
  'payment_schedule_occurrences',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
    scheduleId: text('schedule_id').notNull().references(() => paymentSchedules.id, { onDelete: 'cascade' }),
    dueDate: text('due_date').notNull(),
    transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'set null' }),
    paidAt: text('paid_at'),
    createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    uniqueScheduleDueDate: unique().on(table.scheduleId, table.dueDate),
  }),
);

export const transactionAttachments = sqliteTable('transaction_attachments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  transactionId: text('transaction_id').notNull().references(() => transactions.id, { onDelete: 'cascade' }),
  binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(),
  objectName: text('object_name').notNull(),
  mimeType: text('mime_type'),
  fileSize: integer('file_size'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});

export const investments = sqliteTable('investments', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  binderId: text('binder_id').notNull().references(() => budgetBinders.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  principalAmount: text('principal_amount').notNull().default('0.00'),
  interestRate: text('interest_rate').notNull(),
  interestPeriod: text('interest_period').notNull(),
  compoundingFrequency: text('compounding_frequency').notNull(),
  taxRate: text('tax_rate').default('0.0000'),
  startDate: text('start_date').notNull(),
  maturityDate: text('maturity_date'),
  createdAt: text('created_at').$defaultFn(() => new Date().toISOString()),
});
