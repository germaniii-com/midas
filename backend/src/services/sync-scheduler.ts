import { ToadScheduler, SimpleIntervalJob, AsyncTask } from 'toad-scheduler';
import { sql } from 'drizzle-orm';
import { performSync } from './sync-engine';
import { db } from '../db';
import { syncTargets } from '../db/schema';

export class SyncScheduler {
  private scheduler: ToadScheduler;
  private jobs = new Map<string, SimpleIntervalJob>();

  private static _instance: SyncScheduler | null = null;

  constructor() {
    this.scheduler = new ToadScheduler();
  }

  static init(): SyncScheduler {
    SyncScheduler._instance = new SyncScheduler();
    return SyncScheduler._instance;
  }

  static getInstance(): SyncScheduler {
    if (!SyncScheduler._instance) {
      throw new Error('SyncScheduler not initialized');
    }
    return SyncScheduler._instance;
  }

  add(targetId: string, intervalMinutes: number, binderId: string, target: { host: string; password: string }) {
    this.remove(targetId);

    const task = new AsyncTask(
      `auto-sync-${targetId}`,
      () => performSync(binderId, { id: targetId, host: target.host, password: target.password }),
      (err) => {
        console.error(`Auto-sync failed for target ${targetId}:`, err);
      },
    );

    const job = new SimpleIntervalJob(
      { minutes: intervalMinutes, runImmediately: false },
      task,
      { id: `auto-sync-${targetId}`, preventOverrun: true },
    );

    this.scheduler.addSimpleIntervalJob(job);
    this.jobs.set(targetId, job);
  }

  remove(targetId: string) {
    const id = `auto-sync-${targetId}`;
    if (this.scheduler.existsById(id)) {
      this.scheduler.removeById(id);
    }
    this.jobs.delete(targetId);
  }

  removeAll() {
    for (const targetId of this.jobs.keys()) {
      this.remove(targetId);
    }
  }

  stop() {
    this.scheduler.stop();
  }

  async loadAll() {
    const targets = await db.select().from(syncTargets)
      .where(
        sql`${syncTargets.autoSyncInterval} IS NOT NULL`,
      );

    for (const target of targets) {
      if (target.autoSyncInterval && target.autoSyncInterval > 0) {
        this.add(target.id, target.autoSyncInterval, target.binderId, {
          host: target.host,
          password: target.password,
        });
      }
    }
  }
}
