import { callApi, callApiVoid } from './transport';

export interface Payee {
  id: string;
  binderId: string;
  name: string;
  createdAt: string | null;
}

export function getPayees(binderId: string): Promise<Payee[]> {
  return callApi('getPayees', `/api/binders/${binderId}/payees`, undefined, binderId);
}

export function createPayee(binderId: string, name: string): Promise<Payee> {
  return callApi(
    'createPayee',
    `/api/binders/${binderId}/payees/create`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
    binderId,
    name,
  );
}

export function getPayee(binderId: string, payeeId: string): Promise<Payee> {
  return callApi(
    'getPayee',
    `/api/binders/${binderId}/payees/${payeeId}`,
    undefined,
    binderId,
    payeeId,
  );
}

export function updatePayee(
  binderId: string,
  payeeId: string,
  data: { name?: string },
): Promise<Payee> {
  return callApi(
    'updatePayee',
    `/api/binders/${binderId}/payees/${payeeId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    payeeId,
    data,
  );
}

export function deletePayee(binderId: string, payeeId: string): Promise<void> {
  return callApiVoid(
    'deletePayee',
    `/api/binders/${binderId}/payees/${payeeId}`,
    { method: 'DELETE' },
    binderId,
    payeeId,
  );
}
