import { getServerPassword } from './serverConfig';

export { getApiUrl, getServerUrl, getServerPassword, setServerUrl, setServerPassword, clearServer, getRecentServers, addRecentServer } from './serverConfig';

export class NetworkError extends Error {
  constructor() {
    super('Cannot connect to server. Please check your connection.');
    this.name = 'NetworkError';
  }
}

export async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  try {
    const pw = getServerPassword();
    const headers = new Headers(options?.headers);
    if (pw) {
      headers.set('x-sync-password', pw);
    }
    const res = await fetch(url, { ...options, headers });
    return res;
  } catch {
    throw new NetworkError();
  }
}
