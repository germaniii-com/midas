import { createContext, useContext, useState, useEffect, useCallback, createElement, type ReactNode } from 'react';
import {
  getSyncTargets,
  createSyncTarget,
  deleteSyncTarget,
  triggerSync as triggerSyncApi,
  getSyncStatus,
  type SyncTarget,
  type SyncStatus,
  type CreateSyncTargetData,
} from '../api/sync';

interface SyncContextValue {
  targets: SyncTarget[];
  statuses: Record<string, SyncStatus>;
  loading: boolean;
  syncingIds: Set<string>;
  addTarget: (data: CreateSyncTargetData) => Promise<SyncTarget>;
  removeTarget: (targetId: string) => Promise<void>;
  triggerSync: (targetId: string) => Promise<void>;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children, binderId }: { children: ReactNode; binderId?: string }) {
  const [targets, setTargets] = useState<SyncTarget[]>([]);
  const [statuses, setStatuses] = useState<Record<string, SyncStatus>>({});
  const [loading, setLoading] = useState(true);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!binderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    getSyncTargets(binderId)
      .then(setTargets)
      .catch(() => setTargets([]))
      .finally(() => setLoading(false));
  }, [binderId]);

  useEffect(() => {
    if (syncingIds.size === 0 || !binderId) return;

    const interval = setInterval(async () => {
      for (const targetId of syncingIds) {
        try {
          const status = await getSyncStatus(binderId, targetId);
          setStatuses((prev) => ({ ...prev, [targetId]: status }));

          if (status.status !== 'syncing') {
            setSyncingIds((prev) => {
              const next = new Set(prev);
              next.delete(targetId);
              return next;
            });
            getSyncTargets(binderId).then(setTargets).catch(() => {});
          }
        } catch {}
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [syncingIds, binderId]);

  const addTargetFn = useCallback(
    async (data: CreateSyncTargetData) => {
      if (!binderId) throw new Error('No binder selected');
      const target = await createSyncTarget(binderId, data);
      setTargets((prev) => [...prev, target]);
      return target;
    },
    [binderId],
  );

  const removeTargetFn = useCallback(
    async (targetId: string) => {
      if (!binderId) return;
      await deleteSyncTarget(binderId, targetId);
      setTargets((prev) => prev.filter((t) => t.id !== targetId));
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    },
    [binderId],
  );

  const triggerSyncFn = useCallback(
    async (targetId: string) => {
      if (!binderId) return;
      try {
        await triggerSyncApi(binderId, targetId);
        setSyncingIds((prev) => new Set(prev).add(targetId));
        setStatuses((prev) => ({
          ...prev,
          [targetId]: { status: 'syncing', lastSyncedAt: null, progress: 0 },
        }));
      } catch {
        setStatuses((prev) => ({
          ...prev,
          [targetId]: {
            status: 'failed',
            lastSyncedAt: null,
            lastError: 'Server unreachable',
          },
        }));
      }
    },
    [binderId],
  );

  return createElement(
    SyncContext.Provider,
    {
      value: {
        targets,
        statuses,
        loading,
        syncingIds,
        addTarget: addTargetFn,
        removeTarget: removeTargetFn,
        triggerSync: triggerSyncFn,
      },
    },
    children,
  );
}

export function useSync() {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within a SyncProvider');
  return ctx;
}
