import { eq, and, sql, inArray, gte, lte, notInArray, isNull } from 'drizzle-orm';
import { addDays, format, parseISO, isBefore } from 'date-fns';
import { db } from '../db/index.js';
import {
  transactions,
  accounts,
  payees,
  categories,
  accountCategories,
  paymentSchedules,
  paymentScheduleOccurrences,
  transactionTags,
  tags,
} from '../db/schema.js';
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

export async function getCashFlowReport(
  binderId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    interval?: 'daily' | 'weekly' | 'monthly';
    accountIds?: string[];
    tagIds?: string[];
  } = {},
): Promise<CashFlowDataPoint[]> {
  const {
    startDate = format(new Date(), 'yyyy-01-01'),
    endDate = format(new Date(), 'yyyy-MM-dd'),
    interval = 'monthly',
    accountIds = [],
    tagIds = [],
  } = filters;

  const truncExpr = truncMap[interval];
  const conditions = [
    eq(transactions.binderId, binderId),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
    isNull(transactions.transferId),
  ];
  if (accountIds.length > 0) conditions.push(inArray(transactions.accountId, accountIds));
  if (tagIds.length > 0) {
    const matchingTxIds = db
      .select({ transactionId: transactionTags.transactionId })
      .from(transactionTags)
      .where(inArray(transactionTags.tagId, tagIds));
    conditions.push(inArray(transactions.id, matchingTxIds));
  }

  const result = await db
    .select({
      period: sql<string>`${sql.raw(truncExpr)}`,
      income: sql<string>`COALESCE(SUM(CASE WHEN ${sql.raw(amountReal('amount'))} > 0 THEN ${sql.raw(amountReal('amount'))} ELSE 0 END), 0)`,
      expense: sql<string>`COALESCE(SUM(CASE WHEN ${sql.raw(amountReal('amount'))} < 0 THEN ABS(${sql.raw(amountReal('amount'))}) ELSE 0 END), 0)`,
    })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(sql.raw(truncExpr))
    .orderBy(sql.raw(truncExpr));

  return result.map((r) => ({
    date: r.period.slice(0, 10),
    income: parseFloat(r.income),
    expense: parseFloat(r.expense),
  }));
}

export async function getSpendingBreakdown(
  binderId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    transactionType?: 'income' | 'expense';
    groupBy?: 'category' | 'tags';
    includeTagIds?: string[];
    excludeTagIds?: string[];
  } = {},
): Promise<SpendingBreakdownItem[]> {
  const {
    startDate = format(new Date(), 'yyyy-MM-01'),
    endDate = format(new Date(), 'yyyy-MM-dd'),
    transactionType = 'expense',
    groupBy = 'category',
    includeTagIds = [],
    excludeTagIds = [],
  } = filters;

  const conditions = [
    eq(transactions.binderId, binderId),
    gte(transactions.date, startDate),
    lte(transactions.date, endDate),
    isNull(transactions.transferId),
    transactionType === 'expense'
      ? sql`${sql.raw(amountReal('amount'))} < 0`
      : sql`${sql.raw(amountReal('amount'))} > 0`,
  ];

  if (includeTagIds.length > 0) {
    const matchingTxIds = db
      .select({ transactionId: transactionTags.transactionId })
      .from(transactionTags)
      .where(inArray(transactionTags.tagId, includeTagIds));
    conditions.push(inArray(transactions.id, matchingTxIds));
  }

  if (excludeTagIds.length > 0) {
    const excludeTxIds = db
      .select({ transactionId: transactionTags.transactionId })
      .from(transactionTags)
      .where(inArray(transactionTags.tagId, excludeTagIds));
    conditions.push(notInArray(transactions.id, excludeTxIds));
  }

  if (groupBy === 'tags') {
    const result = await db
      .select({
        categoryName: tags.name,
        totalAmount: sql<string>`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0)`,
      })
      .from(transactions)
      .innerJoin(transactionTags, eq(transactions.id, transactionTags.transactionId))
      .innerJoin(tags, eq(transactionTags.tagId, tags.id))
      .where(and(...conditions))
      .groupBy(tags.name)
      .orderBy(sql`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0) desc`);

    return result.map((r) => ({
      categoryName: r.categoryName,
      totalAmount: parseFloat(r.totalAmount),
    }));
  }

  const result = await db
    .select({
      categoryName: categories.name,
      totalAmount: sql<string>`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0)`,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .innerJoin(accountCategories, eq(accounts.id, accountCategories.accountId))
    .innerJoin(categories, eq(accountCategories.categoryId, categories.id))
    .where(and(...conditions))
    .groupBy(categories.name)
    .orderBy(sql`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0) desc`);

  return result.map((r) => ({
    categoryName: r.categoryName,
    totalAmount: parseFloat(r.totalAmount),
  }));
}

export async function getPayeeAnalysis(
  binderId: string,
  filters: {
    startDate?: string;
    endDate?: string;
    sortBy?: 'amount' | 'count';
    limit?: number;
  } = {},
): Promise<PayeeAnalysisItem[]> {
  const {
    startDate = format(new Date(), 'yyyy-01-01'),
    endDate = format(new Date(), 'yyyy-MM-dd'),
    sortBy = 'amount',
    limit = 10,
  } = filters;

  const result = await db
    .select({
      payeeName: payees.name,
      totalVolume: sql<string>`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0)`,
      transactionCount: sql<number>`COUNT(${transactions.id})`,
    })
    .from(transactions)
    .innerJoin(payees, eq(transactions.payeeId, payees.id))
    .where(
      and(
        eq(transactions.binderId, binderId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate),
        isNull(transactions.transferId),
      ),
    )
    .groupBy(payees.name)
    .orderBy(
      sortBy === 'amount'
        ? sql`COALESCE(SUM(ABS(${sql.raw(amountReal('amount'))})), 0) desc`
        : sql`COUNT(${transactions.id}) desc`,
    )
    .limit(limit);

  return result.map((r) => ({
    payeeName: r.payeeName,
    totalVolume: parseFloat(r.totalVolume),
    transactionCount: Number(r.transactionCount),
  }));
}

export async function getAccountTrends(
  binderId: string,
  filters: { startDate?: string; endDate?: string; interval?: 'daily' | 'weekly' | 'monthly' } = {},
): Promise<AccountTrendData[]> {
  const {
    startDate = format(addDays(new Date(), -90), 'yyyy-MM-dd'),
    endDate = format(new Date(), 'yyyy-MM-dd'),
    interval = 'monthly',
  } = filters;

  const truncExpr = truncMap[interval];

  interface BucketRow {
    accountId: string;
    accountName: string;
    date: string;
    balance: string;
  }

  const rows = await db.all<BucketRow>(
    sql`
      WITH prior AS (
        SELECT
          t.account_id AS accountId,
          COALESCE(SUM(${sql.raw(amountReal('t.amount'))}), 0) AS opening
        FROM transactions t
        WHERE t.binder_id = ${binderId}
          AND t.date < ${startDate}
        GROUP BY t.account_id
      ),
      bucketed AS (
        SELECT
          t.account_id AS accountId,
          ${sql.raw(truncExpr)} AS period,
          COALESCE(SUM(${sql.raw(amountReal('t.amount'))}), 0) AS delta
        FROM transactions t
        WHERE t.binder_id = ${binderId}
          AND t.date >= ${startDate}
          AND t.date <= ${endDate}
        GROUP BY t.account_id, ${sql.raw(truncExpr)}
      )
      SELECT
        b.accountId,
        a.name AS accountName,
        b.period AS date,
        COALESCE(p.opening, 0) + SUM(b.delta) OVER (PARTITION BY b.accountId ORDER BY b.period) AS balance
      FROM bucketed b
      LEFT JOIN prior p ON p.accountId = b.accountId
      INNER JOIN accounts a ON a.id = b.accountId
      ORDER BY b.accountId, b.period
    `,
  );

  const map = new Map<
    string,
    { accountId: string; accountName: string; series: { date: string; balance: number }[] }
  >();
  for (const row of rows) {
    let entry = map.get(row.accountId);
    if (!entry) {
      entry = { accountId: row.accountId, accountName: row.accountName, series: [] };
      map.set(row.accountId, entry);
    }
    entry.series.push({ date: row.date.slice(0, 10), balance: parseFloat(row.balance) });
  }

  const priorOnlyRows = await db.all<BucketRow>(
    sql`
      SELECT
        p.account_id AS accountId,
        a.name AS accountName,
        ${startDate} AS date,
        COALESCE(SUM(${sql.raw(amountReal('p.amount'))}), 0) AS balance
      FROM transactions p
      INNER JOIN accounts a ON a.id = p.account_id AND a.binder_id = ${binderId}
      WHERE p.binder_id = ${binderId}
        AND p.date < ${startDate}
        AND p.account_id NOT IN (
          SELECT DISTINCT t.account_id
          FROM transactions t
          WHERE t.binder_id = ${binderId}
            AND t.date >= ${startDate}
            AND t.date <= ${endDate}
        )
      GROUP BY p.account_id
    `,
  );

  const allPeriods = generatePeriods(startDate, endDate, interval);

  for (const row of priorOnlyRows) {
    if (!map.has(row.accountId)) {
      map.set(row.accountId, {
        accountId: row.accountId,
        accountName: row.accountName,
        series: [{ date: allPeriods[0], balance: parseFloat(row.balance) }],
      });
    }
  }

  for (const entry of map.values()) {
    const dataMap = new Map(entry.series.map((p) => [p.date, p.balance]));
    const firstDataDate = entry.series[0]?.date;
    const firstIdx = firstDataDate ? allPeriods.indexOf(firstDataDate) : -1;
    if (firstIdx === -1) continue;

    let lastBalance = entry.series[0].balance;
    entry.series = allPeriods.slice(firstIdx).map((period) => {
      if (dataMap.has(period)) lastBalance = dataMap.get(period)!;
      return { date: period, balance: lastBalance };
    });
  }

  return Array.from(map.values());
}

export async function getForecast(
  binderId: string,
  filters: { accountId: string; horizonDays?: number; includeDrafts?: boolean },
): Promise<ForecastDataPoint[]> {
  const { accountId, horizonDays = 30, includeDrafts = false } = filters;

  const [balanceRow] = await db
    .select({ balance: sql<string>`COALESCE(SUM(${sql.raw(amountReal('amount'))}), 0)` })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));
  const currentBalance = parseFloat(balanceRow?.balance || '0');

  const scheduleRows = await db
    .select()
    .from(paymentSchedules)
    .where(
      and(
        eq(paymentSchedules.accountId, accountId),
        eq(paymentSchedules.binderId, binderId),
        includeDrafts ? undefined : eq(paymentSchedules.isActive, true),
      ),
    );

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
  const paidOccurrences = await db
    .select({
      scheduleId: paymentScheduleOccurrences.scheduleId,
      dueDate: paymentScheduleOccurrences.dueDate,
    })
    .from(paymentScheduleOccurrences)
    .where(inArray(paymentScheduleOccurrences.scheduleId, scheduleIds));

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

function generatePeriods(startDate: string, endDate: string, interval: string): string[] {
  const periods: string[] = [];
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const current = new Date(start);

  if (interval === 'monthly') {
    current.setDate(1);
  } else if (interval === 'weekly') {
    const day = current.getDay();
    current.setDate(current.getDate() - ((day + 6) % 7));
  }

  while (current <= end) {
    periods.push(format(current, 'yyyy-MM-dd'));
    if (interval === 'daily') {
      current.setDate(current.getDate() + 1);
    } else if (interval === 'weekly') {
      current.setDate(current.getDate() + 7);
    } else {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return periods;
}
