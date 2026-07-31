import { callApi, callApiVoid } from './transport';

export interface CategoryInfo {
  id: string;
  name: string;
}

export interface CategorySum {
  categoryId: string;
  categoryName: string;
  balance: string;
}

export interface Account {
  id: string;
  binderId: string;
  name: string;
  type: string;
  createdAt: string | null;
  balance: string;
  categories: CategoryInfo[];
}

export interface CreateAccountData {
  name: string;
  type: string;
  categoryIds?: string[];
}

export interface UpdateAccountData {
  name?: string;
  type?: string;
  categoryIds?: string[];
}

export function getAccounts(
  binderId: string,
): Promise<{ accounts: Account[]; categorySums: CategorySum[] }> {
  return callApi('getAccounts', `/api/binders/${binderId}/accounts`, undefined, binderId);
}

export function getAccount(binderId: string, accountId: string): Promise<Account> {
  return callApi(
    'getAccount',
    `/api/binders/${binderId}/accounts/${accountId}`,
    undefined,
    binderId,
    accountId,
  );
}

export function createAccount(binderId: string, data: CreateAccountData): Promise<Account> {
  return callApi(
    'createAccount',
    `/api/binders/${binderId}/accounts/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    data,
  );
}

export function updateAccount(
  binderId: string,
  accountId: string,
  data: UpdateAccountData,
): Promise<Account> {
  return callApi(
    'updateAccount',
    `/api/binders/${binderId}/accounts/${accountId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    accountId,
    data,
  );
}

export function deleteAccount(binderId: string, accountId: string): Promise<void> {
  return callApiVoid(
    'deleteAccount',
    `/api/binders/${binderId}/accounts/${accountId}`,
    { method: 'DELETE' },
    binderId,
    accountId,
  );
}
