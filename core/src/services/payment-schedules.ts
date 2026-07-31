import { eq, and, inArray, desc, asc, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import { db } from '../db/index.js';
import {
  paymentSchedules,
  paymentScheduleOccurrences,
  accounts,
  payees,
  transactions,
} from '../db/schema.js';
import { computeNextOccurrences, type ScheduleRule } from '../recurrence.js';

function flipAmount(amount: string): string {
  return amount.startsWith('-') ? amount.slice(1) : `-${amount}`;
}

export interface PaymentSchedule {
  id: string;
  binderId: string;
  name: string;
  accountId: string;
  accountName: string | null;
  payeeId: string | null;
  payeeName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  amount: string;
  repeatInterval: number;
  repeatType: string;
  startDate: string;
  endType: string;
  endDate: string | null;
  endOccurrences: number | null;
  specificDays: unknown;
  weekendAdjustment: string;
  notifyBefore: number;
  notifyType: string | null;
  isActive: boolean | null;
  createdAt: string | null;
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

export interface UpcomingScheduleResult {
  schedule: {
    id: string;
    name: string;
    accountId: string;
    accountName: string | null;
    payeeId: string | null;
    payeeName: string | null;
    transferAccountId: string | null;
    transferAccountName: string | null;
    amount: string;
  };
  occurrence: {
    dueDate: string;
    occurrenceIndex: number;
    daysUntilDue: number;
    status: 'missed' | 'overdue' | 'due_soon' | 'upcoming';
  };
}

const scheduleSelect = {
  id: paymentSchedules.id,
  binderId: paymentSchedules.binderId,
  name: paymentSchedules.name,
  accountId: paymentSchedules.accountId,
  accountName: accounts.name,
  payeeId: paymentSchedules.payeeId,
  payeeName: payees.name,
  transferAccountId: paymentSchedules.transferAccountId,
  transferAccountName: alias(accounts, 'transfer_account').name,
  amount: paymentSchedules.amount,
  repeatInterval: paymentSchedules.repeatInterval,
  repeatType: paymentSchedules.repeatType,
  startDate: paymentSchedules.startDate,
  endType: paymentSchedules.endType,
  endDate: paymentSchedules.endDate,
  endOccurrences: paymentSchedules.endOccurrences,
  specificDays: paymentSchedules.specificDays,
  weekendAdjustment: paymentSchedules.weekendAdjustment,
  notifyBefore: paymentSchedules.notifyBefore,
  notifyType: paymentSchedules.notifyType,
  isActive: paymentSchedules.isActive,
  createdAt: paymentSchedules.createdAt,
};

export async function listPaymentSchedules(
  binderId: string,
  filters: { limit?: number; offset?: number; includeInactive?: boolean } = {},
): Promise<PaymentSchedule[]> {
  const { limit = 50, offset = 0, includeInactive = false } = filters;
  const whereConditions: SQL[] = [eq(paymentSchedules.binderId, binderId)];
  if (!includeInactive) whereConditions.push(eq(paymentSchedules.isActive, true));

  const transferAccount = alias(accounts, 'transfer_account');

  return db
    .select({
      ...scheduleSelect,
      transferAccountName: transferAccount.name,
    })
    .from(paymentSchedules)
    .leftJoin(accounts, eq(paymentSchedules.accountId, accounts.id))
    .leftJoin(payees, eq(paymentSchedules.payeeId, payees.id))
    .leftJoin(transferAccount, eq(paymentSchedules.transferAccountId, transferAccount.id))
    .where(and(...whereConditions))
    .orderBy(desc(paymentSchedules.isActive), asc(paymentSchedules.name))
    .limit(limit)
    .offset(offset);
}

export async function getPaymentSchedule(
  binderId: string,
  scheduleId: string,
): Promise<PaymentSchedule | null> {
  const transferAccount = alias(accounts, 'transfer_account');

  const [schedule] = await db
    .select({
      ...scheduleSelect,
      transferAccountName: transferAccount.name,
    })
    .from(paymentSchedules)
    .leftJoin(accounts, eq(paymentSchedules.accountId, accounts.id))
    .leftJoin(payees, eq(paymentSchedules.payeeId, payees.id))
    .leftJoin(transferAccount, eq(paymentSchedules.transferAccountId, transferAccount.id))
    .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId)));

  return schedule ?? null;
}

export async function createPaymentSchedule(
  binderId: string,
  input: CreateScheduleInput,
): Promise<PaymentSchedule> {
  const [schedule] = await db
    .insert(paymentSchedules)
    .values({
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
    })
    .returning();

  return {
    ...schedule,
    accountName: null,
    payeeName: null,
    transferAccountName: null,
  };
}

export async function updatePaymentSchedule(
  binderId: string,
  scheduleId: string,
  input: Partial<CreateScheduleInput>,
): Promise<PaymentSchedule> {
  const updates: Partial<typeof paymentSchedules.$inferInsert> = {};
  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.accountId !== undefined) updates.accountId = input.accountId;
  if (input.payeeId !== undefined) updates.payeeId = input.payeeId || null;
  if (input.transferAccountId !== undefined)
    updates.transferAccountId = input.transferAccountId || null;
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

  const [schedule] = await db
    .update(paymentSchedules)
    .set(updates)
    .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId)))
    .returning();
  if (!schedule) throw new Error('Payment schedule not found');

  const full = await getPaymentSchedule(binderId, scheduleId);
  return full ?? { ...schedule, accountName: null, payeeName: null, transferAccountName: null };
}

export async function deletePaymentSchedule(binderId: string, scheduleId: string): Promise<void> {
  await db
    .delete(paymentScheduleOccurrences)
    .where(eq(paymentScheduleOccurrences.scheduleId, scheduleId));
  const [schedule] = await db
    .delete(paymentSchedules)
    .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId)))
    .returning({ id: paymentSchedules.id });
  if (!schedule) throw new Error('Payment schedule not found');
}

export async function payPaymentSchedule(
  binderId: string,
  scheduleId: string,
): Promise<{
  occurrence: typeof paymentScheduleOccurrences.$inferSelect;
  transaction: typeof transactions.$inferSelect;
}> {
  const [schedule] = await db
    .select()
    .from(paymentSchedules)
    .where(and(eq(paymentSchedules.id, scheduleId), eq(paymentSchedules.binderId, binderId)));
  if (!schedule) throw new Error('Payment schedule not found');

  const existingOccurrences = await db
    .select({ dueDate: paymentScheduleOccurrences.dueDate })
    .from(paymentScheduleOccurrences)
    .where(eq(paymentScheduleOccurrences.scheduleId, scheduleId));
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

  const [tx] = await db
    .insert(transactions)
    .values({
      binderId,
      accountId: schedule.accountId,
      amount: schedule.amount,
      date: today,
      payeeId: schedule.payeeId,
      transferId: null,
      notes: `Scheduled: ${schedule.name} | ${dueDate}`,
      isCleared: true,
    })
    .returning();

  if (schedule.transferAccountId) {
    const counterpartAmount = flipAmount(schedule.amount);
    const [counterpart] = await db
      .insert(transactions)
      .values({
        binderId,
        accountId: schedule.transferAccountId,
        amount: counterpartAmount,
        date: today,
        payeeId: null,
        transferId: tx.id,
        isCleared: true,
      })
      .returning();

    await db
      .update(transactions)
      .set({ transferId: counterpart.id })
      .where(eq(transactions.id, tx.id));
    tx.transferId = counterpart.id;
  }

  const [occurrence] = await db
    .insert(paymentScheduleOccurrences)
    .values({
      binderId,
      scheduleId,
      dueDate,
      transactionId: tx.id,
      paidAt: new Date().toISOString(),
    })
    .returning();

  return { occurrence, transaction: tx };
}

export async function previewPaymentSchedule(
  rule: ScheduleRule,
  count: number = 5,
): Promise<string[]> {
  const occurrences = computeNextOccurrences(rule, [], count);
  return occurrences.map((o) => o.dueDate);
}

function computeScheduleStatus(dueDate: string): 'overdue' | 'due_soon' | 'upcoming' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + 'T00:00:00');
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due_soon';
  return 'upcoming';
}

export async function getUpcomingPaymentSchedules(
  binderId: string,
): Promise<UpcomingScheduleResult[]> {
  const transferAccount = alias(accounts, 'transfer_account');

  const schedules = await db
    .select({
      ...scheduleSelect,
      transferAccountName: transferAccount.name,
    })
    .from(paymentSchedules)
    .leftJoin(accounts, eq(paymentSchedules.accountId, accounts.id))
    .leftJoin(payees, eq(paymentSchedules.payeeId, payees.id))
    .leftJoin(transferAccount, eq(paymentSchedules.transferAccountId, transferAccount.id))
    .where(and(eq(paymentSchedules.binderId, binderId), eq(paymentSchedules.isActive, true)));

  if (schedules.length === 0) return [];

  const scheduleIds = schedules.map((s) => s.id);
  const allOccurrences = await db
    .select({
      scheduleId: paymentScheduleOccurrences.scheduleId,
      dueDate: paymentScheduleOccurrences.dueDate,
      transactionId: paymentScheduleOccurrences.transactionId,
    })
    .from(paymentScheduleOccurrences)
    .where(inArray(paymentScheduleOccurrences.scheduleId, scheduleIds));

  const paidDatesBySchedule: Record<string, string[]> = {};
  for (const occ of allOccurrences) {
    if (!paidDatesBySchedule[occ.scheduleId]) paidDatesBySchedule[occ.scheduleId] = [];
    paidDatesBySchedule[occ.scheduleId].push(occ.dueDate);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: UpcomingScheduleResult[] = [];

  for (const schedule of schedules) {
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

    const paidDates = paidDatesBySchedule[schedule.id] || [];

    const notifyDays = schedule.notifyBefore;
    let notifyTypeMultiplier = 1;
    if (schedule.notifyType === 'weeks') notifyTypeMultiplier = 7;
    else if (schedule.notifyType === 'months') notifyTypeMultiplier = 30;
    const effectiveNotifyDays = notifyDays * notifyTypeMultiplier;

    const scheduleInfo = {
      id: schedule.id,
      name: schedule.name,
      accountId: schedule.accountId,
      accountName: schedule.accountName,
      payeeId: schedule.payeeId,
      payeeName: schedule.payeeName,
      transferAccountId: schedule.transferAccountId,
      transferAccountName: schedule.transferAccountName,
      amount: schedule.amount,
    };

    const allUnpaid = computeNextOccurrences(rule, paidDates, 100, { includePast: true });

    for (const occ of allUnpaid) {
      const dueDateTime = new Date(occ.dueDate + 'T00:00:00').getTime();
      const diffDays = Math.ceil((dueDateTime - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        results.push({
          schedule: scheduleInfo,
          occurrence: {
            dueDate: occ.dueDate,
            occurrenceIndex: occ.occurrenceIndex,
            daysUntilDue: diffDays,
            status: 'missed',
          },
        });
      } else {
        if (diffDays > effectiveNotifyDays) continue;
        const status = computeScheduleStatus(occ.dueDate);
        results.push({
          schedule: scheduleInfo,
          occurrence: {
            dueDate: occ.dueDate,
            occurrenceIndex: occ.occurrenceIndex,
            daysUntilDue: diffDays,
            status,
          },
        });
        break;
      }
    }
  }

  results.sort((a, b) => {
    const statusOrder: Record<string, number> = { missed: 0, overdue: 1, due_soon: 2, upcoming: 3 };
    const aOrder = statusOrder[a.occurrence.status] ?? 4;
    const bOrder = statusOrder[b.occurrence.status] ?? 4;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return b.occurrence.daysUntilDue - a.occurrence.daysUntilDue;
  });

  return results;
}
