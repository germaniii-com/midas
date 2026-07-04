import { getApiUrl, apiFetch } from '.';
import type { Binder } from './binders';

export interface RemoteBinder {
  id: string;
  name: string;
  description: string | null;
  currency: string;
}

export interface ListRemoteBindersResponse {
  binders: RemoteBinder[];
}

export interface PullRemoteBinderData {
  host: string;
  serverPassword: string;
  binderId: string;
  binderName: string;
  password: string;
}

export async function listRemoteBinders(
  host: string,
  password: string,
): Promise<ListRemoteBindersResponse> {
  const res = await apiFetch(`${getApiUrl()}/api/remote/list-binders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to list remote binders' }));
    throw new Error(err.error || 'Failed to list remote binders');
  }
  return res.json();
}

export async function pullRemoteBinder(
  data: PullRemoteBinderData,
): Promise<Binder> {
  const res = await apiFetch(`${getApiUrl()}/api/remote/pull-binder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Failed to pull binder' }));
    throw new Error(err.error || 'Failed to pull binder');
  }
  return res.json();
}
