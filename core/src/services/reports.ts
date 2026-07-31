import { eq, and, sql, inArray, gte, lte, notInArray, isNull } from 'drizzle-orm';
import { addDays, format, parseISO, isBefore } from 'date-fns';
import { db, sqliteDb } from '../db/index.js';
import { transactions, accounts, payees, categories, accountCategories, paymentSchedules, paymentScheduleOccurrences, transactionTags, tags } from '../db/schema.js';
import { computeNextOccurrences, type ScheduleRule } from '../recurrence.js';

const truncMap = {
  daily: 'date',
  weekly: `date(date, '-' || ((cast(strftime('%w', date) as integer) + 6) % 7) || ' days')`,
  monthly: `strftime('%Y-%m-01', date)`,
} as const;

const amountReal = (col: string) => `CAST(${col} AS REAL)`;

export interface CashFlowDataPoint {
  date: string;
  income: number;
  expense: number;
}

export interface SpendingBreakdownItem {
  categoryName: string;
  totalAmount: number;
}

export interface PayeeAnalysisItem {
  payeeName: string;
  totalVolume: number;
  transactionCount: number;
}

export interface AccountTrendData {
  accountId: string;
  accountName: string;
  series: { date: string; balance: number }[];
}

export interface ForecastDataPoint {
  date: string;
  projectedBalance: number;
  scheduledOutflow: number;
}

export async function getCashFlowReport(binderId: string, filters: { startDate?: string; endDate?: string; interval?: 'daily' | 'weekly' | 'monthly'; accountIds?: string[]; tagIds?: string[] } = {}): Promise<CashFlowDataPoint[]> {
  const { startDate = format(new Date(), 'yyyy-01-01'), endDate = format(new Date(), 'yyyy-MM-dd'), interval = 'monthly', accountIds = [], tagIds = [] } = filters;

  const truncExpr = truncMap[interval];
  const conditions = [eq(transactions.binderId, binderId), gte(transactions.date, startDate), lte(transactions.date, endDate), isNull(transactions.transferId)];
  if (accountIds.length > 0) conditions.push(inArray(transactions.accountId, accountIds));
  if (tagIds.length > 0) {
    const matchingTxIds = db.select({ transactionId: transactionTags.transactionId }).from(transactionTags).where(inArray(transactionTags.tagId, tagIds));
    conditions.push(inArray(transactions.id, matchingTxIds));
  }

  const result = await db.select({
    period: sql<string>`${sql.raw(truncExpr)}`,
    income: sql<string>`COALESCE(SUM(CASE WHEN ${sql.raw(amountReal('amount'))} > 0 THEN ${sql.raw(amountReal('amount'))} ELSE 0 END), 0)`,
    expense: sql<string>`COALESCE(SUM(CASE WHEN ${sql.raw(amountReal('amount'))} < 0 THEN ABS(${sql.raw(amountReal('amount'))}) ELSE 0 END), 0)`,
  }).from(transactions).where(and(...conditions)).groupBy(sql.raw(truncExpr)).orderBy(sql.raw(truncExpr));

  return result.map((r) => ({ date: r.period.slice(0, 10), income: parseFloat(r.income), expense: parseFloat(r.expense) }));
}

export async function getForecast(binderId: string, filters: { accountId: string; horizonDays?: number; includeDrafts?: boolean }): Promise<ForecastDataPoint[]> {
  const { accountId, horizonDays = 30, includeDrafts = false } = filters;

  const [balanceRow] = await db.select({ balance: sql<string>`COALESCE(SUM(${sql.raw(amountReal('amount'))}), 0)` }).from(transactions).where(eq(transactions.accountId, accountId));
  const currentBalance = parseFloat(balanceRow?.balance || '0');

  const scheduleRows = await db.select().from(paymentSchedules).where(and(eq(paymentSchedules.accountId, accountId), eq(paymentSchedules.binderId, binderId), includeDrafts ? undefined : eq(paymentSchedules.isActive, true)));

  if (scheduleRows.length === 0) {
    const today = new Date();
    const result: ForecastDataPoint[] = [];
    for (let i = 0; i <= horizonDays; i++) {
      const d = format(addDays(today, i), 'yyyy-MM-dd');
      result.push({ date: d, projectedBalance: currentBalance, scheduledOutflow: 0 });
    }
    return result;
  }

  const scheduleIds = scheduleRows.map((s) => s.id);
  const paidOccurrences = await db.select({ scheduleId: paymentScheduleOccurrences.scheduleId, dueDate: paymentScheduleOccurrences.dueDate }).from(paymentScheduleOccurrences).where(inArray(paymentScheduleOccurrences.scheduleId, scheduleIds));

  const paidBySchedule: Record<string, string[]> = {};
  for (const occ of paidOccurrences) {
    if (!paidBySchedule[occ.scheduleId]) paidBySchedule[occ.scheduleId] = [];
    paidBySchedule[occ.scheduleId].push(occ.dueDate);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizonDate = addDays(today, horizonDays);

  const outflowByDate: Record<string, number> = {};

  for (const schedule of scheduleRows) {
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

    const paidDates = paidBySchedule[schedule.id] || [];
    const occurrences = computeNextOccurrences(rule, paidDates, horizonDays * 2);

    for (const occ of occurrences) {
      const occDate = parseISO(occ.dueDate);
      if (isBefore(occDate, today) || isBefore(horizonDate, occDate)) continue;
      const amount = parseFloat(schedule.amount);
      outflowByDate[occ.dueDate] = (outflowByDate[occ.dueDate] || 0) - amount;
    }
  }

  const sortedDates = Object.keys(outflowByDate).sort();
  const result: ForecastDataPoint[] = [];
  let runningBalance = currentBalance;
  const dateSet = new Set(sortedDates);

  for (let i = 0; i <= horizonDays; i++) {
    const d = format(addDays(today, i), 'yyyy-MM-dd');
    let outflow = 0;
    if (dateSet.has(d)) {
      outflow = outflowByDate[d];
      runningBalance -= outflow;
    }
    result.push({ date: d, projectedBalance: runningBalance, scheduledOutflow: outflow });
  }

  return result;
}
