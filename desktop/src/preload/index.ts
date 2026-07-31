import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Binders
  getBinders: () => ipcRenderer.invoke('binders:list'),
  getBinderById: (id: string) => ipcRenderer.invoke('binders:get', id),
  createBinder: (data: unknown) => ipcRenderer.invoke('binders:create', data),
  updateBinder: (id: string, data: unknown) => ipcRenderer.invoke('binders:update', id, data),
  loginToBinder: (name: string, password: string) =>
    ipcRenderer.invoke('binders:login', name, password),
  exportBinder: (id: string) => ipcRenderer.invoke('binders:export', id),
  importBinder: (file: ArrayBuffer, fields: Record<string, string>) =>
    ipcRenderer.invoke('binders:import', file, fields),
  importActualBinder: (file: ArrayBuffer, fields: Record<string, string>) =>
    ipcRenderer.invoke('binders:import-actual', file, fields),

  // Accounts
  getAccounts: (binderId: string) => ipcRenderer.invoke('accounts:list', binderId),
  getAccount: (binderId: string, accountId: string) =>
    ipcRenderer.invoke('accounts:get', binderId, accountId),
  createAccount: (binderId: string, data: unknown) =>
    ipcRenderer.invoke('accounts:create', binderId, data),
  updateAccount: (binderId: string, accountId: string, data: unknown) =>
    ipcRenderer.invoke('accounts:update', binderId, accountId, data),
  deleteAccount: (binderId: string, accountId: string) =>
    ipcRenderer.invoke('accounts:delete', binderId, accountId),

  // Transactions
  getTransactions: (binderId: string, filters: unknown) =>
    ipcRenderer.invoke('transactions:list', binderId, filters),
  getTransaction: (binderId: string, transactionId: string) =>
    ipcRenderer.invoke('transactions:get', binderId, transactionId),
  createTransaction: (binderId: string, data: unknown) =>
    ipcRenderer.invoke('transactions:create', binderId, data),
  updateTransaction: (binderId: string, transactionId: string, data: unknown) =>
    ipcRenderer.invoke('transactions:update', binderId, transactionId, data),
  deleteTransaction: (binderId: string, transactionId: string) =>
    ipcRenderer.invoke('transactions:delete', binderId, transactionId),

  // Categories
  getCategories: (binderId: string) => ipcRenderer.invoke('categories:list', binderId),
  getCategory: (binderId: string, categoryId: string) =>
    ipcRenderer.invoke('categories:get', binderId, categoryId),
  createCategory: (binderId: string, data: unknown) =>
    ipcRenderer.invoke('categories:create', binderId, data),
  updateCategory: (binderId: string, categoryId: string, data: unknown) =>
    ipcRenderer.invoke('categories:update', binderId, categoryId, data),
  deleteCategory: (binderId: string, categoryId: string) =>
    ipcRenderer.invoke('categories:delete', binderId, categoryId),

  // Payees
  getPayees: (binderId: string) => ipcRenderer.invoke('payees:list', binderId),
  getPayee: (binderId: string, payeeId: string) =>
    ipcRenderer.invoke('payees:get', binderId, payeeId),
  createPayee: (binderId: string, name: string) =>
    ipcRenderer.invoke('payees:create', binderId, name),
  updatePayee: (binderId: string, payeeId: string, data: unknown) =>
    ipcRenderer.invoke('payees:update', binderId, payeeId, data),
  deletePayee: (binderId: string, payeeId: string) =>
    ipcRenderer.invoke('payees:delete', binderId, payeeId),

  // Tags
  getTags: (binderId: string) => ipcRenderer.invoke('tags:list', binderId),
  getTag: (binderId: string, tagId: string) => ipcRenderer.invoke('tags:get', binderId, tagId),
  createTag: (binderId: string, data: unknown) => ipcRenderer.invoke('tags:create', binderId, data),
  updateTag: (binderId: string, tagId: string, data: unknown) =>
    ipcRenderer.invoke('tags:update', binderId, tagId, data),
  deleteTag: (binderId: string, tagId: string) =>
    ipcRenderer.invoke('tags:delete', binderId, tagId),

  // Payment schedules
  getPaymentSchedules: (binderId: string, filters: unknown) =>
    ipcRenderer.invoke('payment-schedules:list', binderId, filters),
  getPaymentSchedule: (binderId: string, scheduleId: string) =>
    ipcRenderer.invoke('payment-schedules:get', binderId, scheduleId),
  previewScheduleDates: (binderId: string, params: unknown) =>
    ipcRenderer.invoke('payment-schedules:preview', binderId, params),
  createPaymentSchedule: (binderId: string, data: unknown) =>
    ipcRenderer.invoke('payment-schedules:create', binderId, data),
  updatePaymentSchedule: (binderId: string, scheduleId: string, data: unknown) =>
    ipcRenderer.invoke('payment-schedules:update', binderId, scheduleId, data),
  deletePaymentSchedule: (binderId: string, scheduleId: string) =>
    ipcRenderer.invoke('payment-schedules:delete', binderId, scheduleId),
  paySchedule: (binderId: string, scheduleId: string) =>
    ipcRenderer.invoke('payment-schedules:pay', binderId, scheduleId),
  getUpcomingSchedules: (binderId: string) =>
    ipcRenderer.invoke('payment-schedules:upcoming', binderId),

  // Reports
  getCashFlow: (binderId: string, params: unknown) =>
    ipcRenderer.invoke('reports:cash-flow', binderId, params),
  getSpendingBreakdown: (binderId: string, params: unknown) =>
    ipcRenderer.invoke('reports:spending-breakdown', binderId, params),
  getPayeeAnalysis: (binderId: string, params: unknown) =>
    ipcRenderer.invoke('reports:payee-analysis', binderId, params),
  getForecast: (binderId: string, params: unknown) =>
    ipcRenderer.invoke('reports:forecast', binderId, params),
  getAccountTrends: (binderId: string, params: unknown) =>
    ipcRenderer.invoke('reports:account-trends', binderId, params),

  // Attachments
  getAttachments: (binderId: string, transactionId: string) =>
    ipcRenderer.invoke('attachments:list', binderId, transactionId),
  uploadAttachment: (
    file: ArrayBuffer,
    fileName: string,
    mimeType: string,
    binderId: string,
    transactionId: string,
  ) => ipcRenderer.invoke('attachments:upload', file, fileName, mimeType, binderId, transactionId),
  getAttachmentFile: (attachmentId: string) => ipcRenderer.invoke('attachments:file', attachmentId),
  deleteAttachment: (binderId: string, transactionId: string, attachmentId: string) =>
    ipcRenderer.invoke('attachments:delete', binderId, transactionId, attachmentId),

  // Sync
  getSyncTargets: (binderId: string) => ipcRenderer.invoke('sync:targets', binderId),
  createSyncTarget: (binderId: string, data: unknown) =>
    ipcRenderer.invoke('sync:create-target', binderId, data),
  updateSyncTarget: (binderId: string, targetId: string, data: unknown) =>
    ipcRenderer.invoke('sync:update-target', binderId, targetId, data),
  deleteSyncTarget: (binderId: string, targetId: string) =>
    ipcRenderer.invoke('sync:delete-target', binderId, targetId),
  triggerSync: (binderId: string, targetId: string) =>
    ipcRenderer.invoke('sync:trigger', binderId, targetId),
  getSyncStatus: (binderId: string, targetId: string) =>
    ipcRenderer.invoke('sync:status', binderId, targetId),
  exportRemoteBinder: (binderId: string, targetId: string) =>
    ipcRenderer.invoke('sync:export-remote', binderId, targetId),

  // Remote
  listRemoteBinders: (host: string, password: string) =>
    ipcRenderer.invoke('remote:list-binders', host, password),
  pullRemoteBinder: (data: unknown) => ipcRenderer.invoke('remote:pull-binder', data),

  // Metadata
  getApiUrl: 'ipc://local',
  isElectron: true,
});
