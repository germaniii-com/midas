import { callApi, callApiArrayBuffer, uploadForm } from './transport';

export interface Binder {
  id: string;
  name: string;
  description: string | null;
  currency: string;
}

export interface UpdateBinderData {
  name?: string;
  currency?: string;
}

export interface CreateBinderData {
  name: string;
  password: string;
  description?: string;
  currency?: string;
}

export function getBinders(): Promise<Binder[]> {
  return callApi('getBinders', '/api/binders');
}

export function getBinderById(id: string): Promise<Binder> {
  return callApi('getBinderById', `/api/binders/${id}`, undefined, id);
}

export function createBinder(data: CreateBinderData): Promise<Binder> {
  return callApi(
    'createBinder',
    '/api/binders',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    data,
  );
}

export function loginToBinder(
  name: string,
  password: string,
): Promise<{ id: string; name: string }> {
  return callApi(
    'loginToBinder',
    '/api/binders/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    },
    name,
    password,
  );
}

export function updateBinder(id: string, data: UpdateBinderData): Promise<Binder> {
  return callApi(
    'updateBinder',
    `/api/binders/${id}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    id,
    data,
  );
}

export async function exportBinder(id: string): Promise<Blob> {
  const buffer = await callApiArrayBuffer(
    'exportBinder',
    `/api/binders/${id}/export`,
    undefined,
    id,
  );
  return new Blob([buffer], { type: 'application/sql' });
}

export interface ImportBinderData {
  name?: string;
  password: string;
  description?: string;
  currency?: string;
}

export function importBinder(file: File, data: ImportBinderData): Promise<Binder> {
  const fields: Record<string, string> = { password: data.password };
  if (data.name) fields.name = data.name;
  if (data.description) fields.description = data.description;
  if (data.currency) fields.currency = data.currency;
  return uploadForm('importBinder', '/api/binders/import', file, fields);
}

export function importActualBinder(file: File, data: ImportBinderData): Promise<Binder> {
  const fields: Record<string, string> = { password: data.password };
  if (data.name) fields.name = data.name;
  if (data.currency) fields.currency = data.currency;
  return uploadForm('importActualBinder', '/api/binders/import-actual', file, fields);
}
