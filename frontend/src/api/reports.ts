import { callApi } from './transport';

export interface CashFlowRow {
  date: string;
  income: number;
  expense: number;
}

export interface SpendingRow {
  categoryName: string;
  totalAmount: number;
}

export interface PayeeRow {
  payeeName: string;
  totalVolume: number;
  transactionCount: number;
}

export interface ForecastRow {
  date: string;
  projectedBalance: number;
  scheduledOutflow: number;
}

export interface CashFlowParams {
  startDate?: string;
  endDate?: string;
  interval?: 'daily' | 'weekly' | 'monthly';
  accountIds?: string;
  tagIds?: string;
}

export interface SpendingBreakdownParams {
  startDate?: string;
  endDate?: string;
  transactionType?: 'income' | 'expense';
  groupBy?: 'category' | 'tags';
  includeTagIds?: string;
  excludeTagIds?: string;
}

export interface PayeeAnalysisParams {
  startDate?: string;
  endDate?: string;
  sortBy?: 'amount' | 'count';
  limit?: number;
}

export interface ForecastParams {
  accountId: string;
  horizonDays?: number;
  includeDrafts?: boolean;
}

export interface AccountTrendPoint {
  date: string;
  balance: number;
}

export interface AccountTrendSeries {
  accountId: string;
  accountName: string;
  series: AccountTrendPoint[];
}

export interface AccountTrendsParams {
  startDate?: string;
  endDate?: string;
  interval?: 'daily' | 'weekly' | 'monthly';
}

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      qs.set(key, String(value));
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export function getCashFlow(binderId: string, params?: CashFlowParams): Promise<CashFlowRow[]> {
  return callApi(
    'getCashFlow',
    `/api/binders/${binderId}/reports/cash-flow${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
    undefined,
    binderId,
    params,
  );
}

export function getSpendingBreakdown(
  binderId: string,
  params?: SpendingBreakdownParams,
): Promise<SpendingRow[]> {
  return callApi(
    'getSpendingBreakdown',
    `/api/binders/${binderId}/reports/spending-breakdown${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
    undefined,
    binderId,
    params,
  );
}

export function getPayeeAnalysis(
  binderId: string,
  params?: PayeeAnalysisParams,
): Promise<PayeeRow[]> {
  return callApi(
    'getPayeeAnalysis',
    `/api/binders/${binderId}/reports/payee-analysis${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
    undefined,
    binderId,
    params,
  );
}

export function getForecast(binderId: string, params: ForecastParams): Promise<ForecastRow[]> {
  return callApi(
    'getForecast',
    `/api/binders/${binderId}/reports/forecast${buildQuery(params as unknown as Record<string, string | number | boolean | undefined>)}`,
    undefined,
    binderId,
    params,
  );
}

export function getAccountTrends(
  binderId: string,
  params?: AccountTrendsParams,
): Promise<AccountTrendSeries[]> {
  return callApi(
    'getAccountTrends',
    `/api/binders/${binderId}/reports/account-trends${buildQuery(params as Record<string, string | number | boolean | undefined>)}`,
    undefined,
    binderId,
    params,
  );
}
