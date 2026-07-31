import { callApi } from './transport';

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

export function listRemoteBinders(
  host: string,
  password: string,
): Promise<ListRemoteBindersResponse> {
  return callApi(
    'listRemoteBinders',
    '/api/remote/list-binders',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host, password }),
    },
    host,
    password,
  );
}

export function pullRemoteBinder(data: PullRemoteBinderData): Promise<RemoteBinder> {
  return callApi(
    'pullRemoteBinder',
    '/api/remote/pull-binder',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    data,
  );
}
