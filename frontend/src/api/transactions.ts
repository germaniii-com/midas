import { callApi, callApiVoid } from './transport';

export interface TransactionTag {
  id: string;
  name: string;
  color: string | null;
}

export interface TransactionAttachment {
  id: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string | null;
}

export interface Transaction {
  id: string;
  binderId: string;
  accountId: string;
  accountName: string;
  payeeId: string | null;
  payeeName: string | null;
  amount: string;
  date: string;
  notes: string | null;
  isCleared: boolean;
  createdAt: string | null;
  tags: TransactionTag[];
  attachments?: TransactionAttachment[];
  attachmentCount?: number;
  transferId: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
}

export interface CreateTransactionData {
  accountId: string;
  amount: string;
  date: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export interface UpdateTransactionData {
  accountId?: string;
  amount?: string;
  date?: string;
  payeeId?: string | null;
  transferAccountId?: string | null;
  notes?: string | null;
  isCleared?: boolean;
  tagIds?: string[];
}

export interface GetTransactionsResponse {
  transactions: Transaction[];
  totalAmount: string;
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  limit?: number;
  offset?: number;
}

export function getTransactions(
  binderId: string,
  accountId?: string,
  categoryId?: string,
  limit?: number,
  offset?: number,
): Promise<GetTransactionsResponse> {
  const filters: TransactionFilters = { accountId, categoryId, limit, offset };
  const params = new URLSearchParams();
  if (accountId) params.set('accountId', accountId);
  if (categoryId) params.set('categoryId', categoryId);
  if (limit !== undefined) params.set('limit', String(limit));
  if (offset !== undefined) params.set('offset', String(offset));
  const qs = params.toString();

  return callApi(
    'getTransactions',
    `/api/binders/${binderId}/transactions${qs ? `?${qs}` : ''}`,
    undefined,
    binderId,
    filters,
  );
}

export function getTransaction(binderId: string, transactionId: string): Promise<Transaction> {
  return callApi(
    'getTransaction',
    `/api/binders/${binderId}/transactions/${transactionId}`,
    undefined,
    binderId,
    transactionId,
  );
}

export function createTransaction(
  binderId: string,
  data: CreateTransactionData,
): Promise<Transaction> {
  return callApi(
    'createTransaction',
    `/api/binders/${binderId}/transactions/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    data,
  );
}

export function updateTransaction(
  binderId: string,
  transactionId: string,
  data: UpdateTransactionData,
): Promise<Transaction> {
  return callApi(
    'updateTransaction',
    `/api/binders/${binderId}/transactions/${transactionId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    transactionId,
    data,
  );
}

export function deleteTransaction(binderId: string, transactionId: string): Promise<void> {
  return callApiVoid(
    'deleteTransaction',
    `/api/binders/${binderId}/transactions/${transactionId}`,
    { method: 'DELETE' },
    binderId,
    transactionId,
  );
}
