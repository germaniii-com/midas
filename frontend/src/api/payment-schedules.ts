import { callApi, callApiVoid } from './transport';

export interface PaymentSchedule {
  id: string;
  binderId: string;
  name: string;
  accountId: string;
  accountName: string;
  payeeId: string | null;
  payeeName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  amount: string;
  repeatInterval: number;
  repeatType: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endType: 'never' | 'date' | 'after';
  endDate: string | null;
  endOccurrences: number | null;
  specificDays: string[] | null;
  weekendAdjustment: 'none' | 'before' | 'after';
  notifyBefore: number;
  notifyType: 'days' | 'weeks' | 'months';
  isActive: boolean;
  createdAt: string | null;
}

export interface UpcomingScheduleOccurrence {
  dueDate: string;
  occurrenceIndex: number;
  daysUntilDue: number;
  status: 'upcoming' | 'due_soon' | 'overdue' | 'missed';
}

export interface UpcomingSchedule {
  schedule: {
    id: string;
    name: string;
    accountId: string;
    accountName: string;
    payeeId: string | null;
    payeeName: string | null;
    transferAccountId: string | null;
    transferAccountName: string | null;
    amount: string;
  };
  occurrence: UpcomingScheduleOccurrence;
}

export interface PayResult {
  occurrence: {
    id: string;
    scheduleId: string;
    dueDate: string;
    transactionId: string;
    paidAt: string;
  };
  transaction: {
    id: string;
    amount: string;
    date: string;
    accountId: string;
  };
}

export interface CreatePaymentScheduleData {
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

export interface UpdatePaymentScheduleData {
  name?: string;
  accountId?: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  amount?: string;
  repeatInterval?: number;
  repeatType?: 'day' | 'week' | 'month' | 'year';
  startDate?: string;
  endType?: 'never' | 'date' | 'after';
  endDate?: string | null;
  endOccurrences?: number | null;
  specificDays?: string[] | null;
  weekendAdjustment?: 'none' | 'before' | 'after';
  notifyBefore?: number;
  notifyType?: 'days' | 'weeks' | 'months';
  isActive?: boolean;
}

export function getPaymentSchedules(
  binderId: string,
  limit?: number,
  offset?: number,
  includeInactive?: boolean,
): Promise<PaymentSchedule[]> {
  const filters = { limit, offset, includeInactive: includeInactive === true };
  const params = new URLSearchParams();
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));
  if (includeInactive) params.set('includeInactive', 'true');
  const qs = params.toString();

  return callApi(
    'getPaymentSchedules',
    `/api/binders/${binderId}/payment-schedules${qs ? `?${qs}` : ''}`,
    undefined,
    binderId,
    filters,
  );
}

export function getPaymentSchedule(binderId: string, scheduleId: string): Promise<PaymentSchedule> {
  return callApi(
    'getPaymentSchedule',
    `/api/binders/${binderId}/payment-schedules/${scheduleId}`,
    undefined,
    binderId,
    scheduleId,
  );
}

export function previewScheduleDates(
  binderId: string,
  params: {
    repeatInterval: number;
    repeatType: string;
    startDate: string;
    endType?: string;
    endDate?: string | null;
    endOccurrences?: number | null;
    specificDays?: string[] | null;
    weekendAdjustment?: string;
    count?: number;
  },
): Promise<string[]> {
  const qs = new URLSearchParams({
    repeatInterval: String(params.repeatInterval),
    repeatType: params.repeatType,
    startDate: params.startDate,
    endType: params.endType || 'never',
    weekendAdjustment: params.weekendAdjustment || 'none',
    count: String(params.count || 5),
  });
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.endOccurrences) qs.set('endOccurrences', String(params.endOccurrences));
  if (params.specificDays && params.specificDays.length > 0)
    qs.set('specificDays', params.specificDays.join(','));

  return callApi(
    'previewScheduleDates',
    `/api/binders/${binderId}/payment-schedules/preview?${qs}`,
    undefined,
    binderId,
    params,
  );
}

export function createPaymentSchedule(
  binderId: string,
  data: CreatePaymentScheduleData,
): Promise<PaymentSchedule> {
  return callApi(
    'createPaymentSchedule',
    `/api/binders/${binderId}/payment-schedules/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    data,
  );
}

export function updatePaymentSchedule(
  binderId: string,
  scheduleId: string,
  data: UpdatePaymentScheduleData,
): Promise<PaymentSchedule> {
  return callApi(
    'updatePaymentSchedule',
    `/api/binders/${binderId}/payment-schedules/${scheduleId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    scheduleId,
    data,
  );
}

export async function deactivatePaymentSchedule(
  binderId: string,
  scheduleId: string,
): Promise<PaymentSchedule> {
  const date = new Date().toISOString().slice(0, 10);
  return updatePaymentSchedule(binderId, scheduleId, {
    isActive: false,
    name: `(Deactivated ${date})`,
  });
}

export function deletePaymentSchedule(binderId: string, scheduleId: string): Promise<void> {
  return callApiVoid(
    'deletePaymentSchedule',
    `/api/binders/${binderId}/payment-schedules/${scheduleId}`,
    { method: 'DELETE' },
    binderId,
    scheduleId,
  );
}

export function paySchedule(binderId: string, scheduleId: string): Promise<PayResult> {
  return callApi(
    'paySchedule',
    `/api/binders/${binderId}/payment-schedules/${scheduleId}/pay`,
    { method: 'POST' },
    binderId,
    scheduleId,
  );
}

export function getUpcomingSchedules(binderId: string): Promise<UpcomingSchedule[]> {
  return callApi(
    'getUpcomingSchedules',
    `/api/binders/${binderId}/payment-schedules/upcoming`,
    undefined,
    binderId,
  );
}
