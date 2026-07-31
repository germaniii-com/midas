import type { Binder, CreateBinderData, UpdateBinderData } from './api/binders';
import type { Account, CategorySum, CreateAccountData, UpdateAccountData } from './api/accounts';
import type {
  CreateTransactionData,
  GetTransactionsResponse,
  Transaction,
  TransactionFilters,
  UpdateTransactionData,
} from './api/transactions';
import type { Category, CreateCategoryData, UpdateCategoryData } from './api/categories';
import type { Payee } from './api/payees';
import type { CreateTagData, Tag, UpdateTagData } from './api/tags';
import type {
  CreatePaymentScheduleData,
  PayResult,
  PaymentSchedule,
  UpdatePaymentScheduleData,
  UpcomingSchedule,
} from './api/payment-schedules';
import type {
  AccountTrendSeries,
  CashFlowRow,
  ForecastRow,
  PayeeRow,
  SpendingRow,
} from './api/reports';
import type { AttachmentFile, TransactionAttachment } from './api/attachments';
import type { CreateSyncTargetData, SyncStatus, SyncTarget } from './api/sync';
import type { ListRemoteBindersResponse, PullRemoteBinderData, RemoteBinder } from './api/remote';

declare global {
  interface ElectronAPI {
    // Binders
    getBinders(): Promise<Binder[]>;
    getBinderById(id: string): Promise<Binder>;
    createBinder(data: CreateBinderData): Promise<Binder>;
    updateBinder(id: string, data: UpdateBinderData): Promise<Binder>;
    loginToBinder(name: string, password: string): Promise<{ id: string; name: string }>;
    exportBinder(id: string): Promise<ArrayBuffer>;
    importBinder(file: ArrayBuffer, fields: Record<string, string>): Promise<Binder>;
    importActualBinder(file: ArrayBuffer, fields: Record<string, string>): Promise<Binder>;

    // Accounts
    getAccounts(binderId: string): Promise<{ accounts: Account[]; categorySums: CategorySum[] }>;
    getAccount(binderId: string, accountId: string): Promise<Account>;
    createAccount(binderId: string, data: CreateAccountData): Promise<Account>;
    updateAccount(binderId: string, accountId: string, data: UpdateAccountData): Promise<Account>;
    deleteAccount(binderId: string, accountId: string): Promise<void>;

    // Transactions
    getTransactions(
      binderId: string,
      filters: TransactionFilters,
    ): Promise<GetTransactionsResponse>;
    getTransaction(binderId: string, transactionId: string): Promise<Transaction>;
    createTransaction(binderId: string, data: CreateTransactionData): Promise<Transaction>;
    updateTransaction(
      binderId: string,
      transactionId: string,
      data: UpdateTransactionData,
    ): Promise<Transaction>;
    deleteTransaction(binderId: string, transactionId: string): Promise<void>;

    // Categories
    getCategories(binderId: string): Promise<Category[]>;
    getCategory(binderId: string, categoryId: string): Promise<Category>;
    createCategory(binderId: string, data: CreateCategoryData): Promise<Category>;
    updateCategory(
      binderId: string,
      categoryId: string,
      data: UpdateCategoryData,
    ): Promise<Category>;
    deleteCategory(binderId: string, categoryId: string): Promise<void>;

    // Payees
    getPayees(binderId: string): Promise<Payee[]>;
    createPayee(binderId: string, name: string): Promise<Payee>;
    getPayee(binderId: string, payeeId: string): Promise<Payee>;
    updatePayee(binderId: string, payeeId: string, data: { name?: string }): Promise<Payee>;
    deletePayee(binderId: string, payeeId: string): Promise<void>;

    // Tags
    getTags(binderId: string): Promise<Tag[]>;
    getTag(binderId: string, tagId: string): Promise<Tag>;
    createTag(binderId: string, data: CreateTagData): Promise<Tag>;
    updateTag(binderId: string, tagId: string, data: UpdateTagData): Promise<Tag>;
    deleteTag(binderId: string, tagId: string): Promise<void>;

    // Payment schedules
    getPaymentSchedules(
      binderId: string,
      filters: { limit?: number; offset?: number; includeInactive?: boolean },
    ): Promise<PaymentSchedule[]>;
    getPaymentSchedule(binderId: string, scheduleId: string): Promise<PaymentSchedule>;
    previewScheduleDates(
      binderId: string,
      params: {
        repeatInterval: number;
        repeatType: string;
        startDate: string;
        endType?: string;
        endDate?: string | null;
        endOccurrences?: number | null;
        specificDays?: string[] | null;
        weekendAdjustment?: string;
        count?: number;
      },
    ): Promise<string[]>;
    createPaymentSchedule(
      binderId: string,
      data: CreatePaymentScheduleData,
    ): Promise<PaymentSchedule>;
    updatePaymentSchedule(
      binderId: string,
      scheduleId: string,
      data: UpdatePaymentScheduleData,
    ): Promise<PaymentSchedule>;
    deletePaymentSchedule(binderId: string, scheduleId: string): Promise<void>;
    paySchedule(binderId: string, scheduleId: string): Promise<PayResult>;
    getUpcomingSchedules(binderId: string): Promise<UpcomingSchedule[]>;

    // Reports
    getCashFlow(binderId: string, params?: Record<string, unknown>): Promise<CashFlowRow[]>;
    getSpendingBreakdown(
      binderId: string,
      params?: Record<string, unknown>,
    ): Promise<SpendingRow[]>;
    getPayeeAnalysis(binderId: string, params?: Record<string, unknown>): Promise<PayeeRow[]>;
    getForecast(binderId: string, params: Record<string, unknown>): Promise<ForecastRow[]>;
    getAccountTrends(
      binderId: string,
      params?: Record<string, unknown>,
    ): Promise<AccountTrendSeries[]>;

    // Attachments
    getAttachments(binderId: string, transactionId: string): Promise<TransactionAttachment[]>;
    uploadAttachment(
      file: ArrayBuffer,
      fileName: string,
      mimeType: string,
      binderId: string,
      transactionId: string,
    ): Promise<TransactionAttachment>;
    getAttachmentFile(attachmentId: string): Promise<AttachmentFile | null>;
    deleteAttachment(binderId: string, transactionId: string, attachmentId: string): Promise<void>;

    // Sync
    getSyncTargets(binderId: string): Promise<SyncTarget[]>;
    createSyncTarget(binderId: string, data: CreateSyncTargetData): Promise<SyncTarget>;
    updateSyncTarget(
      binderId: string,
      targetId: string,
      data: Partial<CreateSyncTargetData>,
    ): Promise<SyncTarget>;
    deleteSyncTarget(binderId: string, targetId: string): Promise<void>;
    triggerSync(binderId: string, targetId: string): Promise<void>;
    getSyncStatus(binderId: string, targetId: string): Promise<SyncStatus>;
    exportRemoteBinder(binderId: string, targetId: string): Promise<ArrayBuffer>;

    // Remote
    listRemoteBinders(host: string, password: string): Promise<ListRemoteBindersResponse>;
    pullRemoteBinder(data: PullRemoteBinderData): Promise<RemoteBinder>;

    // Metadata
    getApiUrl: string;
    isElectron: boolean;
  }

  interface Window {
    electronAPI?: ElectronAPI;
    __ENV__?: {
      VITE_API_URL?: string;
    };
  }
}

export {};
