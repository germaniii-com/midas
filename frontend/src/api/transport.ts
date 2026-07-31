import { getApiUrl, getServerPassword } from './serverConfig';

export class NetworkError extends Error {
  constructor() {
    super('Cannot connect to server. Please check your connection.');
    this.name = 'NetworkError';
  }
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

function stripIpcErrorPrefix(message: string): string {
  return message.replace(/^Error invoking remote method '[^']+':\s*/, '');
}

export async function callApi<T>(
  ipcMethod: keyof ElectronAPI,
  httpPath: string,
  httpOptions?: RequestInit,
  ...ipcArgs: unknown[]
): Promise<T> {
  if (isElectron()) {
    try {
      const api = window.electronAPI as unknown as Record<
        string,
        (...args: unknown[]) => Promise<unknown>
      >;
      return (await api[ipcMethod](...ipcArgs)) as T;
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(stripIpcErrorPrefix(err.message));
      }
      throw err;
    }
  }

  const pw = getServerPassword();
  const headers = new Headers(httpOptions?.headers);
  if (pw) headers.set('x-sync-password', pw);

  try {
    const res = await fetch(`${getApiUrl()}${httpPath}`, { ...httpOptions, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof TypeError) throw new NetworkError();
    throw err;
  }
}

export async function callApiVoid(
  ipcMethod: keyof ElectronAPI,
  httpPath: string,
  httpOptions?: RequestInit,
  ...ipcArgs: unknown[]
): Promise<void> {
  await callApi<unknown>(ipcMethod, httpPath, httpOptions, ...ipcArgs);
}

export async function callApiArrayBuffer(
  ipcMethod: keyof ElectronAPI,
  httpPath: string,
  httpOptions?: RequestInit,
  ...ipcArgs: unknown[]
): Promise<ArrayBuffer> {
  if (isElectron()) {
    try {
      const api = window.electronAPI as unknown as Record<
        string,
        (...args: unknown[]) => Promise<unknown>
      >;
      return (await api[ipcMethod](...ipcArgs)) as ArrayBuffer;
    } catch (err) {
      if (err instanceof Error) throw new Error(stripIpcErrorPrefix(err.message));
      throw err;
    }
  }

  const pw = getServerPassword();
  const headers = new Headers(httpOptions?.headers);
  if (pw) headers.set('x-sync-password', pw);

  try {
    const res = await fetch(`${getApiUrl()}${httpPath}`, { ...httpOptions, headers });
    if (!res.ok) throw new Error('Download failed');
    return await res.arrayBuffer();
  } catch (err) {
    if (err instanceof TypeError) throw new NetworkError();
    throw err;
  }
}

async function postForm<T>(httpPath: string, formData: FormData): Promise<T> {
  const pw = getServerPassword();
  const headers: Record<string, string> = {};
  if (pw) headers['x-sync-password'] = pw;

  try {
    const res = await fetch(`${getApiUrl()}${httpPath}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof TypeError) throw new NetworkError();
    throw err;
  }
}

export async function uploadFile<T>(
  ipcMethod: keyof ElectronAPI,
  httpPath: string,
  file: File,
  ...ipcArgs: unknown[]
): Promise<T> {
  if (isElectron()) {
    const arrayBuffer = await file.arrayBuffer();
    return callApi<T>(
      ipcMethod,
      httpPath,
      undefined,
      arrayBuffer,
      file.name,
      file.type,
      ...ipcArgs,
    );
  }

  const formData = new FormData();
  formData.append('file', file);
  return postForm<T>(httpPath, formData);
}

export async function uploadForm<T>(
  ipcMethod: keyof ElectronAPI,
  httpPath: string,
  file: File,
  fields: Record<string, string>,
  ...ipcArgs: unknown[]
): Promise<T> {
  if (isElectron()) {
    const arrayBuffer = await file.arrayBuffer();
    return callApi<T>(ipcMethod, httpPath, undefined, arrayBuffer, fields, ...ipcArgs);
  }

  const formData = new FormData();
  formData.append('file', file);
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return postForm<T>(httpPath, formData);
}

export function arrayBufferToBase64(buffer: ArrayBuffer, mimeType: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}
