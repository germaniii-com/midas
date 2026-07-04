const STORAGE_URL_KEY = 'midas:server:url';
const STORAGE_PASSWORD_KEY = 'midas:server:password';
const STORAGE_RECENT_KEY = 'midas:server:recent';

export interface RecentServer {
  url: string;
  lastConnected: string;
}

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

export function getApiUrl(): string {
  if (isElectron()) {
    return window.electronAPI!.getApiUrl;
  }
  const stored = getServerUrl();
  if (stored) return stored;
  const runtimeEnv = typeof window !== 'undefined' ? window.__ENV__ : undefined;
  return runtimeEnv?.VITE_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5001';
}

export function getServerUrl(): string | null {
  try {
    return localStorage.getItem(STORAGE_URL_KEY);
  } catch {
    return null;
  }
}

export function setServerUrl(url: string): void {
  localStorage.setItem(STORAGE_URL_KEY, url.replace(/\/+$/, '').replace(/\/api$/, ''));
}

export function getServerPassword(): string | null {
  try {
    return localStorage.getItem(STORAGE_PASSWORD_KEY);
  } catch {
    return null;
  }
}

export function setServerPassword(pw: string): void {
  localStorage.setItem(STORAGE_PASSWORD_KEY, pw);
}

export function clearServer(): void {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_PASSWORD_KEY);
}

export function getRecentServers(): RecentServer[] {
  try {
    const raw = localStorage.getItem(STORAGE_RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentServer(url: string): void {
  const normalized = url.replace(/\/+$/, '').replace(/\/api$/, '');
  const servers = getRecentServers().filter((s) => s.url !== normalized);
  servers.unshift({ url: normalized, lastConnected: new Date().toISOString() });
  localStorage.setItem(STORAGE_RECENT_KEY, JSON.stringify(servers.slice(0, 5)));
}
