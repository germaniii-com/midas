import { API_URL } from '.';

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

export async function getBinders(): Promise<Binder[]> {
  const res = await fetch(`${API_URL}/api/binders`);
  if (!res.ok) throw new Error('Failed to fetch binders');
  return res.json();
}

export async function getBinderById(id: string): Promise<Binder> {
  const res = await fetch(`${API_URL}/api/binders/${id}`);
  if (!res.ok) throw new Error('Binder not found');
  return res.json();
}

export async function createBinder(data: CreateBinderData): Promise<Binder> {
  const res = await fetch(`${API_URL}/api/binders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create binder');
  return res.json();
}

export async function loginToBinder(
  name: string,
  password: string
): Promise<{ id: string; name: string }> {
  const res = await fetch(`${API_URL}/api/binders/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || 'Login failed');
  }
  return res.json();
}

export async function updateBinder(
  id: string,
  data: UpdateBinderData,
): Promise<Binder> {
  const res = await fetch(`${API_URL}/api/binders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to update binder' }));
    throw new Error(err.error || 'Failed to update binder');
  }
  return res.json();
}
