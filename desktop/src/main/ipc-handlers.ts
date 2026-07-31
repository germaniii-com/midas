import { ipcMain } from 'electron';
import { loadCore, loadDrizzleMigrator, getDrizzleDir } from './core-loader';
import { SyncScheduler } from './sync-scheduler';

type CoreModule = typeof import('@midas/core');

let core: CoreModule | null = null;

export function initCore(): void {
  core = loadCore();
  const { migrate } = loadDrizzleMigrator();
  migrate(core.db, { migrationsFolder: getDrizzleDir() });
  void core.storage.init();
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

function getCore(): CoreModule {
  if (!core) throw new Error('Core not initialized');
  return core;
}

function findSyncTarget(binderId: string, targetId: string) {
  const c = getCore();
  const target = c.sqliteDb
    .prepare('SELECT * FROM sync_targets WHERE id = ? AND binder_id = ?')
    .get(targetId, binderId) as Record<string, unknown> | undefined;
  if (!target) throw new Error('Sync target not found');
  return target;
}

export function registerIpcHandlers() {
  // ─── Binders ───
  ipcMain.handle('binders:list', async () => {
    return getCore().listBinders();
  });

  ipcMain.handle('binders:get', async (_e, id: string) => {
    return getCore().getBinder(id);
  });

  ipcMain.handle('binders:create', async (_e, data: unknown) => {
    return getCore().createBinder(data as never);
  });

  ipcMain.handle('binders:update', async (_e, id: string, data: unknown) => {
    return getCore().updateBinder(id, data as never);
  });

  ipcMain.handle('binders:login', async (_e, name: string, password: string) => {
    return getCore().loginBinder(name, password);
  });

  ipcMain.handle('binders:export', async (_e, id: string) => {
    const sql = await getCore().exportBinder(id);
    return new TextEncoder().encode(sql).buffer;
  });

  ipcMain.handle(
    'binders:import',
    async (_e, fileBuffer: ArrayBuffer, fields: Record<string, string>) => {
      const sql = new TextDecoder().decode(fileBuffer);
      return getCore().importBinder(
        sql,
        fields.password,
        fields.name,
        fields.description,
        fields.currency,
      );
    },
  );

  ipcMain.handle(
    'binders:import-actual',
    async (_e, fileBuffer: ArrayBuffer, fields: Record<string, string>) => {
      return getCore().importFromActual(
        Buffer.from(fileBuffer),
        fields.password,
        fields.name,
        fields.currency,
      );
    },
  );

  // ─── Accounts ───
  ipcMain.handle('accounts:list', async (_e, binderId: string) => {
    return getCore().listAccounts(binderId);
  });

  ipcMain.handle('accounts:get', async (_e, binderId: string, accountId: string) => {
    return getCore().getAccount(binderId, accountId);
  });

  ipcMain.handle('accounts:create', async (_e, binderId: string, data: unknown) => {
    return getCore().createAccount(binderId, data as never);
  });

  ipcMain.handle(
    'accounts:update',
    async (_e, binderId: string, accountId: string, data: unknown) => {
      return getCore().updateAccount(binderId, accountId, data as never);
    },
  );

  ipcMain.handle('accounts:delete', async (_e, binderId: string, accountId: string) => {
    await getCore().deleteAccount(binderId, accountId);
  });

  // ─── Transactions ───
  ipcMain.handle('transactions:list', async (_e, binderId: string, filters: unknown) => {
    return getCore().listTransactions(binderId, filters as never);
  });

  ipcMain.handle('transactions:get', async (_e, binderId: string, transactionId: string) => {
    return getCore().getTransaction(binderId, transactionId);
  });

  ipcMain.handle('transactions:create', async (_e, binderId: string, data: unknown) => {
    return getCore().createTransaction(binderId, data as never);
  });

  ipcMain.handle(
    'transactions:update',
    async (_e, binderId: string, transactionId: string, data: unknown) => {
      return getCore().updateTransaction(binderId, transactionId, data as never);
    },
  );

  ipcMain.handle('transactions:delete', async (_e, binderId: string, transactionId: string) => {
    await getCore().deleteTransaction(binderId, transactionId);
  });

  // ─── Categories ───
  ipcMain.handle('categories:list', async (_e, binderId: string) => {
    return getCore().listCategories(binderId);
  });

  ipcMain.handle('categories:get', async (_e, binderId: string, categoryId: string) => {
    return getCore().getCategory(binderId, categoryId);
  });

  ipcMain.handle('categories:create', async (_e, binderId: string, data: unknown) => {
    return getCore().createCategory(binderId, data as never);
  });

  ipcMain.handle(
    'categories:update',
    async (_e, binderId: string, categoryId: string, data: unknown) => {
      return getCore().updateCategory(binderId, categoryId, data as never);
    },
  );

  ipcMain.handle('categories:delete', async (_e, binderId: string, categoryId: string) => {
    await getCore().deleteCategory(binderId, categoryId);
  });

  // ─── Payees ───
  ipcMain.handle('payees:list', async (_e, binderId: string) => {
    return getCore().listPayees(binderId);
  });

  ipcMain.handle('payees:get', async (_e, binderId: string, payeeId: string) => {
    return getCore().getPayee(binderId, payeeId);
  });

  ipcMain.handle('payees:create', async (_e, binderId: string, name: string) => {
    return getCore().createPayee(binderId, { name });
  });

  ipcMain.handle('payees:update', async (_e, binderId: string, payeeId: string, data: unknown) => {
    return getCore().updatePayee(binderId, payeeId, data as never);
  });

  ipcMain.handle('payees:delete', async (_e, binderId: string, payeeId: string) => {
    await getCore().deletePayee(binderId, payeeId);
  });

  // ─── Tags ───
  ipcMain.handle('tags:list', async (_e, binderId: string) => {
    return getCore().listTags(binderId);
  });

  ipcMain.handle('tags:get', async (_e, binderId: string, tagId: string) => {
    return getCore().getTag(binderId, tagId);
  });

  ipcMain.handle('tags:create', async (_e, binderId: string, data: unknown) => {
    return getCore().createTag(binderId, data as never);
  });

  ipcMain.handle('tags:update', async (_e, binderId: string, tagId: string, data: unknown) => {
    return getCore().updateTag(binderId, tagId, data as never);
  });

  ipcMain.handle('tags:delete', async (_e, binderId: string, tagId: string) => {
    await getCore().deleteTag(binderId, tagId);
  });

  // ─── Payment schedules ───
  ipcMain.handle('payment-schedules:list', async (_e, binderId: string, filters: unknown) => {
    return getCore().listPaymentSchedules(binderId, filters as never);
  });

  ipcMain.handle('payment-schedules:get', async (_e, binderId: string, scheduleId: string) => {
    return getCore().getPaymentSchedule(binderId, scheduleId);
  });

  ipcMain.handle(
    'payment-schedules:preview',
    async (_e, binderId: string, params: Record<string, unknown>) => {
      const rule = {
        repeatInterval: Number(params.repeatInterval) || 1,
        repeatType: ((params.repeatType as string) || 'month') as 'day' | 'week' | 'month' | 'year',
        startDate: params.startDate as string,
        endType: ((params.endType as string) || 'never') as 'never' | 'date' | 'after',
        endDate: (params.endDate as string) || null,
        endOccurrences: params.endOccurrences ? Number(params.endOccurrences) || null : null,
        specificDays: Array.isArray(params.specificDays) ? (params.specificDays as string[]) : null,
        weekendAdjustment: ((params.weekendAdjustment as string) || 'none') as
          'none' | 'before' | 'after',
      };
      return getCore().previewPaymentSchedule(rule, Number(params.count) || 5);
    },
  );

  ipcMain.handle('payment-schedules:create', async (_e, binderId: string, data: unknown) => {
    return getCore().createPaymentSchedule(binderId, data as never);
  });

  ipcMain.handle(
    'payment-schedules:update',
    async (_e, binderId: string, scheduleId: string, data: unknown) => {
      return getCore().updatePaymentSchedule(binderId, scheduleId, data as never);
    },
  );

  ipcMain.handle('payment-schedules:delete', async (_e, binderId: string, scheduleId: string) => {
    await getCore().deletePaymentSchedule(binderId, scheduleId);
  });

  ipcMain.handle('payment-schedules:pay', async (_e, binderId: string, scheduleId: string) => {
    return getCore().payPaymentSchedule(binderId, scheduleId);
  });

  ipcMain.handle('payment-schedules:upcoming', async (_e, binderId: string) => {
    return getCore().getUpcomingPaymentSchedules(binderId);
  });

  // ─── Reports ───
  ipcMain.handle(
    'reports:cash-flow',
    async (_e, binderId: string, params: Record<string, unknown> = {}) => {
      const accountIds = params.accountIds
        ? String(params.accountIds)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const tagIds = params.tagIds
        ? String(params.tagIds)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      return getCore().getCashFlowReport(binderId, {
        startDate: params.startDate as string | undefined,
        endDate: params.endDate as string | undefined,
        interval: params.interval as never,
        accountIds,
        tagIds,
      });
    },
  );

  ipcMain.handle(
    'reports:spending-breakdown',
    async (_e, binderId: string, params: Record<string, unknown> = {}) => {
      const includeTagIds = params.includeTagIds
        ? String(params.includeTagIds)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const excludeTagIds = params.excludeTagIds
        ? String(params.excludeTagIds)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      return getCore().getSpendingBreakdown(binderId, {
        startDate: params.startDate as string | undefined,
        endDate: params.endDate as string | undefined,
        transactionType: params.transactionType as never,
        groupBy: params.groupBy as never,
        includeTagIds,
        excludeTagIds,
      });
    },
  );

  ipcMain.handle(
    'reports:payee-analysis',
    async (_e, binderId: string, params: Record<string, unknown> = {}) => {
      return getCore().getPayeeAnalysis(binderId, {
        startDate: params.startDate as string | undefined,
        endDate: params.endDate as string | undefined,
        sortBy: params.sortBy as never,
        limit: params.limit ? Number(params.limit) : undefined,
      });
    },
  );

  ipcMain.handle(
    'reports:forecast',
    async (_e, binderId: string, params: Record<string, unknown> = {}) => {
      return getCore().getForecast(binderId, {
        accountId: params.accountId as string,
        horizonDays: params.horizonDays ? Number(params.horizonDays) : undefined,
        includeDrafts: params.includeDrafts === true,
      });
    },
  );

  ipcMain.handle(
    'reports:account-trends',
    async (_e, binderId: string, params: Record<string, unknown> = {}) => {
      return getCore().getAccountTrends(binderId, {
        startDate: params.startDate as string | undefined,
        endDate: params.endDate as string | undefined,
        interval: params.interval as never,
      });
    },
  );

  // ─── Attachments ───
  ipcMain.handle('attachments:list', async (_e, binderId: string, transactionId: string) => {
    return getCore().listAttachments(binderId, transactionId);
  });

  ipcMain.handle(
    'attachments:upload',
    async (
      _e,
      fileBuffer: ArrayBuffer,
      fileName: string,
      mimeType: string,
      binderId: string,
      transactionId: string,
    ) => {
      return getCore().uploadAttachment(binderId, transactionId, {
        buffer: Buffer.from(fileBuffer),
        fileName,
        mimeType,
      });
    },
  );

  ipcMain.handle('attachments:file', async (_e, attachmentId: string) => {
    const file = await getCore().getAttachmentFile(attachmentId);
    if (!file) return null;
    return { buffer: toArrayBuffer(file.buffer), mimeType: file.mimeType, fileName: file.fileName };
  });

  ipcMain.handle(
    'attachments:delete',
    async (_e, binderId: string, transactionId: string, attachmentId: string) => {
      await getCore().deleteAttachment(transactionId, attachmentId);
    },
  );

  // ─── Sync ───
  ipcMain.handle('sync:targets', async (_e, binderId: string) => {
    return getCore().listSyncTargets(binderId);
  });

  ipcMain.handle(
    'sync:create-target',
    async (
      _e,
      binderId: string,
      data: { host: string; password: string; autoSyncInterval?: number },
    ) => {
      const target = await getCore().createSyncTarget(binderId, data);

      if (data.autoSyncInterval && data.autoSyncInterval > 0) {
        SyncScheduler.getInstance().add(target.id, data.autoSyncInterval, binderId, {
          host: data.host,
          password: data.password,
        });
      }

      return target;
    },
  );

  ipcMain.handle(
    'sync:update-target',
    async (
      _e,
      binderId: string,
      targetId: string,
      data: { host?: string; password?: string; autoSyncInterval?: number | null },
    ) => {
      const target = await getCore().updateSyncTarget(binderId, targetId, data);

      const ss = SyncScheduler.getInstance();
      ss.remove(targetId);
      if (target.autoSyncInterval && target.autoSyncInterval > 0) {
        ss.add(targetId, target.autoSyncInterval, binderId, {
          host: target.host,
          password: data.password ?? '',
        });
      }

      return target;
    },
  );

  ipcMain.handle('sync:delete-target', async (_e, binderId: string, targetId: string) => {
    await getCore().deleteSyncTarget(binderId, targetId);
    SyncScheduler.getInstance().remove(targetId);
  });

  ipcMain.handle('sync:trigger', async (_e, binderId: string, targetId: string) => {
    const target = findSyncTarget(binderId, targetId);
    const running = getCore()
      .sqliteDb.prepare('SELECT id FROM sync_jobs WHERE target_id = ? AND status = ?')
      .get(targetId, 'running');
    if (running) throw new Error('Sync already in progress');

    void getCore()
      .performSync(binderId, {
        id: String(target.id),
        host: String(target.host),
        password: String(target.password),
      })
      .catch((err) => {
        console.error(`Sync failed for target ${targetId}:`, err);
      });
  });

  ipcMain.handle('sync:status', async (_e, binderId: string, targetId: string) => {
    return getCore().getSyncStatus(binderId, targetId);
  });

  ipcMain.handle('sync:export-remote', async (_e, binderId: string, targetId: string) => {
    const target = findSyncTarget(binderId, targetId);
    const exportUrl = `${String(target.host).replace(/\/+$/, '')}/api/binders/${binderId}/export`;

    const res = await fetch(exportUrl, {
      headers: { 'x-sync-password': String(target.password) },
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Export failed');
      throw new Error(errorText);
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    return toArrayBuffer(buffer);
  });

  // ─── Remote ───
  ipcMain.handle('remote:list-binders', async (_e, host: string, password: string) => {
    const binders = await getCore().listRemoteBinders(host, password);
    return { binders };
  });

  ipcMain.handle(
    'remote:pull-binder',
    async (
      _e,
      data: {
        host: string;
        serverPassword: string;
        binderId: string;
        binderName: string;
        password: string;
      },
    ) => {
      return getCore().pullRemoteBinder(
        data.host,
        data.serverPassword,
        data.binderId,
        data.binderName,
        data.password,
      );
    },
  );
}
