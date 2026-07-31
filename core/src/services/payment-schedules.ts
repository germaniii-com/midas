export { computeNextOccurrences, type ScheduleRule, type Occurrence } from '../recurrence.js';

import { eq, and, sql, inArray, desc, asc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../db/index.js';
import { paymentSchedules, paymentScheduleOccurrences, accounts, payees, transactions } from '../db/schema.js';
import { computeNextOccurrences, type ScheduleRule } from '../recurrence.js';

function flipAmount(amount: string): string {
  return amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
}

export interface PaymentSchedule {
  id: string;
  binderId: string;
  name: string;
  accountId: string;
  payeeId: string | null;
  transferAccountId: string | null;
  amount: string;
  repeatInterval: number;
  repeatType: string;
  startDate: string;
  endType: string;
  endDate: string | null;
  endOccurrences: number | null;
  specificDays: string[] | null;
  weekendAdjustment: string;
  notifyBefore: number;
  notifyType: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateScheduleInput {
  name: string;
  accountId: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  amount: string;
  repeatInterval: number;
  repeatType: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endType?: 'never' | 'date' | 'after';
  endDate?: string | null;
  endOccurrences?: number | null;
  specificDays?: string[] | null;
  weekendAdjustment?: 'none' | 'before' | 'after';
  notifyBefore?: number;
  notifyType?: 'days' | 'weeks' | 'months';
  isActive?: boolean;
}

export async function listPaymentSchedules(binderId: string, filters: { limit?: number; offset?: number; includeInactive?: boolean } = {}): Promise<PaymentSchedule[]> {
  const { limit = 50, offset = 0, includeInactive = false } = filters;
  const whereConditions = [eq(paymentSchedules.binderId, binderId)];
  if (!includeInactive) whereConditions.push(eq(paymentSchedules.isActive, true));

  return db.select().from(paymentSchedules).where(and(...whereConditions)).orderBy(desc(paymentSchedules.isActive), asc(paymentSchedules.name)).limit(limit).offset(offset);
}

export async function getPaymentSchedule(binderId: string, scheduleId: string): Promise<PaymentSchedule | null> {
  const [schedule] = await db.select().from(paymentSchedules).where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId)));
  return schedule ?? null;
}

export async function createPaymentSchedule(binderId: string, input: CreateScheduleInput): Promise<PaymentSchedule> {
  const [schedule] = await db.insert(paymentSchedules).values({
    binderId,
    name: input.name.trim(),
    accountId: input.accountId,
    payeeId: input.payeeId ?? null,
    transferAccountId: input.transferAccountId ?? null,
    amount: input.amount,
    repeatInterval: input.repeatInterval ?? 1,
    repeatType: input.repeatType,
    startDate: input.startDate,
    endType: input.endType ?? 'never',
    endDate: input.endDate ?? null,
    endOccurrences: input.endOccurrences ?? null,
    specificDays: input.specificDays ?? null,
    weekendAdjustment: input.weekendAdjustment ?? 'none',
    notifyBefore: input.notifyBefore ?? 7,
    notifyType: input.notifyType ?? 'days',
    isActive: input.isActive ?? true,
  }).returning();
  return schedule;
}

export async function updatePaymentSchedule(binderId: string, scheduleId: string, input: Partial<CreateScheduleInput>): Promise<PaymentSchedule> {
  const updates: Partial<typeof paymentSchedules.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.accountId !== undefined) updates.accountId = input.accountId;
  if (input.payeeId !== undefined) updates.payeeId = input.payeeId || null;
  if (input.transferAccountId !== undefined) updates.transferAccountId = input.transferAccountId || null;
  if (input.amount !== undefined) updates.amount = input.amount;
  if (input.repeatInterval !== undefined) updates.repeatInterval = input.repeatInterval;
  if (input.repeatType !== undefined) updates.repeatType = input.repeatType;
  if (input.startDate !== undefined) updates.startDate = input.startDate;
  if (input.endType !== undefined) updates.endType = input.endType;
  if (input.endDate !== undefined) updates.endDate = input.endDate || null;
  if (input.endOccurrences !== undefined) updates.endOccurrences = input.endOccurrences || null;
  if (input.specificDays !== undefined) updates.specificDays = input.specificDays || null;
  if (input.weekendAdjustment !== undefined) updates.weekendAdjustment = input.weekendAdjustment;
  if (input.notifyBefore !== undefined) updates.notifyBefore = input.notifyBefore;
  if (input.notifyType !== undefined) updates.notifyType = input.notifyType;
  if (input.isActive !== undefined) updates.isActive = input.isActive;

  const [schedule] = await db.update(paymentSchedules).set(updates).where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId))).returning();
  if (!schedule) throw new Error('Payment schedule not found');
  return schedule;
}

export async function deletePaymentSchedule(binderId: string, scheduleId: string): Promise<void> {
  await db.delete(paymentScheduleOccurrences).where(eq(paymentScheduleOccurrences.scheduleId, scheduleId));
  const [schedule] = await db.delete(paymentSchedules).where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId))).returning({ id: paymentSchedules.id });
  if (!schedule) throw new Error('Payment schedule not found');
}

export async function payPaymentSchedule(binderId: string, scheduleId: string): Promise<{ occurrence: typeof paymentScheduleOccurrences.$inferSelect; transaction: typeof transactions.$inferSelect }> {
  const [schedule] = await db.select().from(paymentSchedules).where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId)));
  if (!schedule) throw new Error('Payment schedule not found');

  const existingOccurrences = await db.select({ dueDate: paymentScheduleOccurrences.dueDate }).from(paymentScheduleOccurrences).where(eq(paymentScheduleOccurrences.scheduleId, scheduleId));
  const paidDates = existingOccurrences.map((o) => o.dueDate);

  const rule: ScheduleRule = {
    repeatInterval: schedule.repeatInterval,
    repeatType: schedule.repeatType as ScheduleRule['repeatType'],
    startDate: schedule.startDate,
    endType: schedule.endType as ScheduleRule['endType'],
    endDate: schedule.endDate,
    endOccurrences: schedule.endOccurrences,
    specificDays: schedule.specificDays as string[] | null,
    weekendAdjustment: schedule.weekendAdjustment as ScheduleRule['weekendAdjustment'],
  };

  const nextOccurrences = computeNextOccurrences(rule, paidDates, 1, { includePast: true });
  if (nextOccurrences.length === 0) throw new Error('No upcoming occurrences to pay');

  const dueDate = nextOccurrences[0].dueDate;
  const today = new Date().toISOString().slice(0, 10);

  const [tx] = await db.insert(transactions).values({
    binderId,
    accountId: schedule.accountId,
    amount: schedule.amount,
    date: today,
    payeeId: schedule.payeeId,
    transferId: null,
    notes: `Scheduled: ${schedule.name} | ${dueDate}`,
    isCleared: true,
  }).returning();

  if (schedule.transferAccountId) {
    const counterpartAmount = flipAmount(schedule.amount);
    const [counterpart] = await db.insert(transactions).values({
      binderId,
      accountId: schedule.transferAccountId,
      amount: counterpartAmount,
      date: today,
      payeeId: null,
      transferId: tx.id,
      isCleared: true,
    }).returning();

    await db.update(transactions).set({ transferId: counterpart.id }).where(eq(transactions.id, tx.id));
    tx.transferId = counterpart.id;
  }

  const [occurrence] = await db.insert(paymentScheduleOccurrences).values({
    binderId,
    scheduleId,
    dueDate,
    transactionId: tx.id,
    paidAt: new Date().toISOString(),
  }).returning();

  return { occurrence, transaction: tx };
}

export async function previewPaymentSchedule(rule: ScheduleRule, count: number = 5): Promise<string[]> {
  const occurrences = computeNextOccurrences(rule, [], count);
  return occurrences.map(o => o.dueDate);
}
