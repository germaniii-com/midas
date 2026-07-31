import { callApi, callApiVoid, callApiArrayBuffer } from './transport';

export interface SyncTarget {
  id: string;
  binderId: string;
  host: string;
  autoSyncInterval: number | null;
  lastSyncedAt: string | null;
  lastSyncStatus: string;
  lastError: string | null;
  createdAt: string;
}

export interface SyncStatus {
  status: 'syncing' | 'idle' | 'completed' | 'failed';
  phase?: string;
  currentTable?: string;
  totalRecords?: number;
  syncedRecords?: number;
  progress?: number;
  lastSyncedAt: string | null;
  lastError?: string | null;
}

export interface CreateSyncTargetData {
  host: string;
  password: string;
  autoSyncInterval?: number;
}

export function getSyncTargets(binderId: string): Promise<SyncTarget[]> {
  return callApi('getSyncTargets', `/api/binders/${binderId}/sync-targets`, undefined, binderId);
}

export function createSyncTarget(
  binderId: string,
  data: CreateSyncTargetData,
): Promise<SyncTarget> {
  return callApi(
    'createSyncTarget',
    `/api/binders/${binderId}/sync-targets`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    data,
  );
}

export function updateSyncTarget(
  binderId: string,
  targetId: string,
  data: Partial<CreateSyncTargetData>,
): Promise<SyncTarget> {
  return callApi(
    'updateSyncTarget',
    `/api/binders/${binderId}/sync-targets/${targetId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    },
    binderId,
    targetId,
    data,
  );
}

export function deleteSyncTarget(binderId: string, targetId: string): Promise<void> {
  return callApiVoid(
    'deleteSyncTarget',
    `/api/binders/${binderId}/sync-targets/${targetId}`,
    { method: 'DELETE' },
    binderId,
    targetId,
  );
}

export function triggerSync(binderId: string, targetId: string): Promise<void> {
  return callApiVoid(
    'triggerSync',
    `/api/binders/${binderId}/sync-targets/${targetId}/sync`,
    { method: 'POST' },
    binderId,
    targetId,
  );
}

export function getSyncStatus(binderId: string, targetId: string): Promise<SyncStatus> {
  return callApi(
    'getSyncStatus',
    `/api/binders/${binderId}/sync-targets/${targetId}/status`,
    undefined,
    binderId,
    targetId,
  );
}

export async function exportRemoteBinder(binderId: string, targetId: string): Promise<Blob> {
  const buffer = await callApiArrayBuffer(
    'exportRemoteBinder',
    `/api/binders/${binderId}/sync-targets/${targetId}/export`,
    undefined,
    binderId,
    targetId,
  );
  return new Blob([buffer], { type: 'application/sql' });
}
