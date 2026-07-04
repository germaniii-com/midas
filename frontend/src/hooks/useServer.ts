import { createContext, useContext, useState, useCallback, createElement, type ReactNode } from 'react';
import {
  getApiUrl,
  setServerUrl,
  setServerPassword,
  clearServer,
  getRecentServers,
  addRecentServer,
  type RecentServer,
} from '../api/serverConfig';

interface ServerContextType {
  apiUrl: string;
  isConnected: boolean;
  recentServers: RecentServer[];
  connect: (url: string, password?: string) => Promise<void>;
  disconnect: () => void;
}

const ServerContext = createContext<ServerContextType | null>(null);

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI?.isElectron;
}

export function ServerProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(() => {
    if (isElectron()) return true;
    try {
      return !!localStorage.getItem('midas:server:url');
    } catch {
      return false;
    }
  });
  const [recentServers, setRecentServers] = useState<RecentServer[]>(getRecentServers);
  const [apiUrl, setApiUrl] = useState(getApiUrl);

  const connect = useCallback(async (url: string, password?: string) => {
    const normalizedUrl = url.replace(/\/+$/, '');

    const res = await fetch(`${normalizedUrl}/api/health`, {
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error('Cannot connect to server. Check the URL and ensure it is running.');
    }

    setServerUrl(normalizedUrl);
    if (password) {
      setServerPassword(password);
    } else {
      setServerPassword('');
    }
    addRecentServer(normalizedUrl);

    setApiUrl(normalizedUrl);
    setRecentServers(getRecentServers());
    setConnected(true);
  }, []);

  const disconnect = useCallback(() => {
    clearServer();
    setConnected(false);
    setApiUrl(getApiUrl());
  }, []);

  return createElement(
    ServerContext.Provider,
    { value: { apiUrl, isConnected: connected, recentServers, connect, disconnect } },
    children,
  );
}

export function useServer() {
  const ctx = useContext(ServerContext);
  if (!ctx) throw new Error('useServer must be used within a ServerProvider');
  return ctx;
}
