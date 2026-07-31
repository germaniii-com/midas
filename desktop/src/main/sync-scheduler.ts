import { loadCore } from './core-loader';

interface TargetConfig {
  host: string;
  password: string;
}

export class SyncScheduler {
  private timers = new Map<string, NodeJS.Timeout>();

  private static _instance: SyncScheduler | null = null;

  static init(): SyncScheduler {
    SyncScheduler._instance = new SyncScheduler();
    return SyncScheduler._instance;
  }

  static getInstance(): SyncScheduler {
    if (!SyncScheduler._instance) {
      SyncScheduler._instance = new SyncScheduler();
    }
    return SyncScheduler._instance;
  }

  add(targetId: string, intervalMinutes: number, binderId: string, target: TargetConfig) {
    this.remove(targetId);
    const timer = setInterval(
      () => {
        void loadCore()
          .performSync(binderId, { id: targetId, host: target.host, password: target.password })
          .catch((err: unknown) => {
            console.error(`Auto-sync failed for target ${targetId}:`, err);
          });
      },
      intervalMinutes * 60 * 1000,
    );
    this.timers.set(targetId, timer);
  }

  remove(targetId: string) {
    const timer = this.timers.get(targetId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(targetId);
    }
  }

  removeAll() {
    for (const targetId of this.timers.keys()) {
      this.remove(targetId);
    }
  }

  async loadAll() {
    const c = loadCore();
    const targets = c.sqliteDb
      .prepare('SELECT * FROM sync_targets WHERE auto_sync_interval IS NOT NULL')
      .all() as {
      id: string;
      binder_id: string;
      host: string;
      password: string;
      auto_sync_interval: number | null;
    }[];

    for (const target of targets) {
      if (target.auto_sync_interval && target.auto_sync_interval > 0) {
        this.add(target.id, target.auto_sync_interval, target.binder_id, {
          host: target.host,
          password: target.password,
        });
      }
    }
  }
}
