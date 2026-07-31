# Midas Architecture

## Package Structure

```
midas.germaniii.com/
├── core/           # @midas/core - Business logic, database, and shared types
├── frontend/       # @midas/react - React web application
├── backend/        # @midas/api - Fastify HTTP API server
├── desktop/        # @midas/desktop - Electron desktop application
```

## Packages

### @midas/core

Core business logic, database schema, and data access layer. This package is framework-agnostic and can be used by any frontend or backend without HTTP dependencies.

**Responsibilities:**
- Database schema (Drizzle ORM)
- Business logic functions (CRUD operations, calculations, reports)
- Shared TypeScript types and interfaces
- Recurrence computation
- Sync engine logic
- Storage abstraction

**Exports:**
- `db` - Database connection and Drizzle instance
- `schema` - All database tables and types
- `services/*` - Business logic functions for each domain
- `types` - Shared TypeScript interfaces

### @midas/api

Fastify HTTP server that exposes the core logic via REST API endpoints.

**Responsibilities:**
- HTTP request/response handling
- Authentication and authorization
- File upload/download
- Sync protocol endpoints
- Rate limiting and middleware

### @midas/react

React web application that consumes the API.

**Responsibilities:**
- UI components
- State management
- API client calls
- Routing

### @midas/desktop

Electron application that can run with local core or connect to remote API.

**Responsibilities:**
- Desktop-specific UI
- Local database option (using @midas/core directly)
- System tray and native features

---

## Core Services - API Endpoints to Migrate

The following business logic should be extracted from `backend/src/routes/` into `@midas/core` services:

### 1. Binders

**Current Route:** `backend/src/routes/binders.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/binders.ts

export async function listBinders(): Promise<Binder[]>
export async function getBinder(id: string): Promise<Binder | null>
export async function createBinder(input: { name: string; password: string; description?: string; currency?: string }): Promise<Binder>
export async function updateBinder(id: string, input: { name?: string; currency?: string }): Promise<Binder>
export async function loginBinder(name: string, password: string): Promise<{ id: string; name: string }>
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders` | List all binders |
| GET | `/binders/:id` | Get binder by ID |
| POST | `/binders` | Create new binder |
| PUT | `/binders/:id` | Update binder |
| POST | `/binders/login` | Authenticate binder |

---

### 2. Accounts

**Current Route:** `backend/src/routes/accounts.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/accounts.ts

export async function listAccounts(binderId: string): Promise<AccountWithBalance[]>
export async function getAccount(binderId: string, accountId: string): Promise<AccountWithCategories | null>
export async function createAccount(binderId: string, input: { name: string; type: string; categoryIds?: string[] }): Promise<AccountWithCategories>
export async function updateAccount(binderId: string, accountId: string, input: { name?: string; type?: string; categoryIds?: string[] }): Promise<AccountWithCategories>
export async function deleteAccount(binderId: string, accountId: string): Promise<void>
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/accounts` | List accounts with balances |
| GET | `/binders/:id/accounts/:accountId` | Get account by ID |
| POST | `/binders/:id/accounts/create` | Create account |
| PUT | `/binders/:id/accounts/:accountId` | Update account |
| DELETE | `/binders/:id/accounts/:accountId` | Delete account |

---

### 3. Transactions

**Current Route:** `backend/src/routes/transactions.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/transactions.ts

export async function listTransactions(binderId: string, filters: { accountId?: string; categoryId?: string; limit?: number; offset?: number }): Promise<{ transactions: TransactionWithDetails[]; totalAmount: string }>
export async function getTransaction(binderId: string, transactionId: string): Promise<TransactionWithDetails | null>
export async function createTransaction(binderId: string, input: CreateTransactionInput): Promise<TransactionWithDetails>
export async function updateTransaction(binderId: string, transactionId: string, input: UpdateTransactionInput): Promise<TransactionWithDetails>
export async function deleteTransaction(binderId: string, transactionId: string): Promise<void>

// Helper
function flipAmount(amount: string): string
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/transactions` | List transactions with filters |
| GET | `/binders/:id/transactions/:transactionId` | Get transaction by ID |
| POST | `/binders/:id/transactions/create` | Create transaction |
| PUT | `/binders/:id/transactions/:transactionId` | Update transaction |
| DELETE | `/binders/:id/transactions/:transactionId` | Delete transaction |

---

### 4. Categories

**Current Route:** `backend/src/routes/categories.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/categories.ts

export async function listCategories(binderId: string): Promise<Category[]>
export async function getCategory(binderId: string, categoryId: string): Promise<Category | null>
export async function createCategory(binderId: string, input: { name: string }): Promise<Category>
export async function updateCategory(binderId: string, categoryId: string, input: { name?: string }): Promise<Category>
export async function deleteCategory(binderId: string, categoryId: string): Promise<void>
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/categories` | List categories |
| GET | `/binders/:id/categories/:categoryId` | Get category by ID |
| POST | `/binders/:id/categories/create` | Create category |
| PUT | `/binders/:id/categories/:categoryId` | Update category |
| DELETE | `/binders/:id/categories/:categoryId` | Delete category |

---

### 5. Payees

**Current Route:** `backend/src/routes/payees.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/payees.ts

export async function listPayees(binderId: string): Promise<Payee[]>
export async function getPayee(binderId: string, payeeId: string): Promise<Payee | null>
export async function createPayee(binderId: string, input: { name: string }): Promise<Payee>
export async function updatePayee(binderId: string, payeeId: string, input: { name?: string }): Promise<Payee>
export async function deletePayee(binderId: string, payeeId: string): Promise<void>
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/payees` | List payees |
| GET | `/binders/:id/payees/:payeeId` | Get payee by ID |
| POST | `/binders/:id/payees/create` | Create payee |
| PUT | `/binders/:id/payees/:payeeId` | Update payee |
| DELETE | `/binders/:id/payees/:payeeId` | Delete payee |

---

### 6. Tags

**Current Route:** `backend/src/routes/tags.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/tags.ts

export async function listTags(binderId: string): Promise<Tag[]>
export async function getTag(binderId: string, tagId: string): Promise<Tag | null>
export async function createTag(binderId: string, input: { name: string; color?: string }): Promise<Tag>
export async function updateTag(binderId: string, tagId: string, input: { name?: string; color?: string }): Promise<Tag>
export async function deleteTag(binderId: string, tagId: string): Promise<void>
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/tags` | List tags |
| GET | `/binders/:id/tags/:tagId` | Get tag by ID |
| POST | `/binders/:id/tags/create` | Create tag |
| PUT | `/binders/:id/tags/:tagId` | Update tag |
| DELETE | `/binders/:id/tags/:tagId` | Delete tag |

---

### 7. Payment Schedules

**Current Route:** `backend/src/routes/payment-schedules.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/payment-schedules.ts

export async function listPaymentSchedules(binderId: string, filters: { limit?: number; offset?: number; includeInactive?: boolean }): Promise<PaymentScheduleWithDetails[]>
export async function getPaymentSchedule(binderId: string, scheduleId: string): Promise<PaymentScheduleWithDetails | null>
export async function createPaymentSchedule(binderId: string, input: CreateScheduleInput): Promise<PaymentSchedule>
export async function updatePaymentSchedule(binderId: string, scheduleId: string, input: UpdateScheduleInput): Promise<PaymentSchedule>
export async function deletePaymentSchedule(binderId: string, scheduleId: string): Promise<void>
export async function payPaymentSchedule(binderId: string, scheduleId: string): Promise<{ occurrence: PaymentScheduleOccurrence; transaction: Transaction }>
export async function getUpcomingPaymentSchedules(binderId: string): Promise<UpcomingScheduleResult[]>
export async function previewPaymentSchedule(rule: ScheduleRule, count?: number): Promise<string[]>

// Helper
function computeScheduleStatus(dueDate: string): 'overdue' | 'due_soon' | 'upcoming' | 'missed'
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/payment-schedules` | List payment schedules |
| GET | `/binders/:id/payment-schedules/:scheduleId` | Get schedule by ID |
| GET | `/binders/:id/payment-schedules/preview` | Preview schedule occurrences |
| GET | `/binders/:id/payment-schedules/upcoming` | Get upcoming schedules |
| POST | `/binders/:id/payment-schedules/create` | Create schedule |
| PUT | `/binders/:id/payment-schedules/:scheduleId` | Update schedule |
| DELETE | `/binders/:id/payment-schedules/:scheduleId` | Delete schedule |
| POST | `/binders/:id/payment-schedules/:scheduleId/pay` | Pay schedule |

---

### 8. Reports

**Current Route:** `backend/src/routes/reports.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/reports.ts

export async function getCashFlowReport(binderId: string, filters: { startDate?: string; endDate?: string; interval?: 'daily' | 'weekly' | 'monthly'; accountIds?: string[]; tagIds?: string[] }): Promise<CashFlowDataPoint[]>
export async function getSpendingBreakdown(binderId: string, filters: { startDate?: string; endDate?: string; transactionType?: 'income' | 'expense'; groupBy?: 'category' | 'tags'; includeTagIds?: string[]; excludeTagIds?: string[] }): Promise<SpendingBreakdownItem[]>
export async function getPayeeAnalysis(binderId: string, filters: { startDate?: string; endDate?: string; sortBy?: 'amount' | 'count'; limit?: number }): Promise<PayeeAnalysisItem[]>
export async function getAccountTrends(binderId: string, filters: { startDate?: string; endDate?: string; interval?: 'daily' | 'weekly' | 'monthly' }): Promise<AccountTrendData[]>
export async function getForecast(binderId: string, filters: { accountId: string; horizonDays?: number; includeDrafts?: boolean }): Promise<ForecastDataPoint[]>

// Helper
function generatePeriods(startDate: string, endDate: string, interval: string): string[]
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/reports/cash-flow` | Cash flow report |
| GET | `/binders/:id/reports/spending-breakdown` | Spending breakdown by category/tags |
| GET | `/binders/:id/reports/payee-analysis` | Payee analysis |
| GET | `/binders/:id/reports/account-trends` | Account balance trends |
| GET | `/binders/:id/reports/forecast` | Balance forecast |

---

### 9. Attachments

**Current Route:** `backend/src/routes/attachments.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/attachments.ts

export async function listAttachments(binderId: string, transactionId: string): Promise<Attachment[]>
export async function getAttachment(transactionId: string, attachmentId: string): Promise<Attachment | null>
export async function uploadAttachment(binderId: string, transactionId: string, file: { buffer: Buffer; fileName: string; mimeType: string }): Promise<Attachment>
export async function getAttachmentFile(attachmentId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string } | null>
export async function getAttachmentThumbnail(attachmentId: string): Promise<{ buffer: Buffer; mimeType: string } | null>
export async function deleteAttachment(transactionId: string, attachmentId: string): Promise<void>
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/transactions/:transactionId/attachments` | List attachments |
| GET | `/binders/:id/transactions/:transactionId/attachments/:attachmentId` | Get attachment file |
| GET | `/binders/:id/transactions/:transactionId/attachments/:attachmentId/thumbnail` | Get thumbnail |
| POST | `/binders/:id/transactions/:transactionId/attachments` | Upload attachment |
| DELETE | `/binders/:id/transactions/:transactionId/attachments/:attachmentId` | Delete attachment |

---

### 10. Sync

**Current Route:** `backend/src/routes/sync.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/sync.ts

// Sync targets management
export async function listSyncTargets(binderId: string): Promise<SyncTarget[]>
export async function createSyncTarget(binderId: string, input: { host: string; password: string; autoSyncInterval?: number }): Promise<SyncTarget>
export async function updateSyncTarget(binderId: string, targetId: string, input: { host?: string; password?: string; autoSyncInterval?: number | null }): Promise<SyncTarget>
export async function deleteSyncTarget(binderId: string, targetId: string): Promise<void>
export async function triggerSync(binderId: string, targetId: string): Promise<void>
export async function getSyncStatus(binderId: string, targetId: string): Promise<SyncStatus>

// Sync engine (internal)
export async function performSync(binderId: string, target: { id: string; host: string; password: string }): Promise<void>
export function upsertRows(table: string, rows: Record<string, unknown>[]): void

// Sync scheduler
export class SyncScheduler {
  static getInstance(): SyncScheduler
  add(targetId: string, interval: number, binderId: string, config: { host: string; password: string }): void
  remove(targetId: string): void
}
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/sync-targets` | List sync targets |
| POST | `/binders/:id/sync-targets` | Create sync target |
| PUT | `/binders/:id/sync-targets/:targetId` | Update sync target |
| DELETE | `/binders/:id/sync-targets/:targetId` | Delete sync target |
| POST | `/binders/:id/sync-targets/:targetId/sync` | Trigger sync |
| GET | `/binders/:id/sync-targets/:targetId/status` | Get sync status |
| GET | `/binders/:id/sync-targets/:targetId/export` | Export from remote |

**Sync Protocol Endpoints (receiver):**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sync/binder` | Receive binder data |
| POST | `/sync/push/:binderId` | Receive table data |
| GET | `/sync/pull/:binderId` | Pull table data |
| POST | `/sync/attachments/:binderId` | Receive attachment |
| GET | `/sync/attachments/:binderId/:attachmentId` | Get attachment |
| GET | `/sync/binders` | List binders for sync |

---

### 11. Binder Import/Export

**Current Route:** `backend/src/routes/binder-io.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/binder-io.ts

export async function exportBinder(binderId: string): Promise<string>
export async function importBinder(sqlContent: string, password: string, nameOverride?: string, descriptionOverride?: string, currencyOverride?: string): Promise<Binder>
export async function importBinderPreservingUuids(sqlContent: string, password: string, expectedName: string): Promise<Binder>

// Helpers
function buildInsert(table: string, columns: string[], rows: Record<string, unknown>[]): string | null
function parseValuesIntoRows(valuesPart: string): string[]
function splitRowValues(row: string): string[]
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/binders/:id/export` | Export binder as SQL |
| POST | `/binders/import` | Import binder from SQL |

---

### 12. Actual Budget Import

**Current Route:** `backend/src/routes/actual-import.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/actual-import.ts

export async function importFromActual(fileBuffer: Buffer, password: string, nameOverride?: string, currencyOverride?: string): Promise<Binder>

// Helpers
function dateFromYyyyMmDd(d: number): string
function centsToDecimal(cents: number): string
function getPayeeName(payees: Record<string, unknown>[], payeeId: string): string | null
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/binders/import-actual` | Import from Actual Budget |

---

### 13. Remote Operations

**Current Route:** `backend/src/routes/remote.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/services/remote.ts

export async function listRemoteBinders(host: string, password: string): Promise<Binder[]>
export async function pullRemoteBinder(host: string, serverPassword: string, binderId: string, binderName: string, password: string): Promise<Binder>
```

**API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/remote/list-binders` | List remote binders |
| POST | `/remote/pull-binder` | Pull binder from remote |

---

### 14. Recurrence

**Current File:** `backend/src/recurrence.ts`

**Core Service Functions:**
```typescript
// @midas/core/src/recurrence.ts

export interface ScheduleRule {
  repeatInterval: number;
  repeatType: 'day' | 'week' | 'month' | 'year';
  startDate: string;
  endType: 'never' | 'date' | 'after';
  endDate: string | null;
  endOccurrences: number | null;
  specificDays: string[] | null;
  weekendAdjustment: 'none' | 'before' | 'after';
}

export interface Occurrence {
  dueDate: string;
  occurrenceIndex: number;
}

export function computeNextOccurrences(rule: ScheduleRule, paidDates: string[], count: number, options?: { includePast?: boolean }): Occurrence[]
```

---

## Database Schema

The schema is defined in `@midas/core/src/db/schema.ts` and includes:

| Table | Description |
|-------|-------------|
| `budget_binders` | Top-level budget containers |
| `accounts` | Financial accounts |
| `categories` | Transaction categories |
| `tags` | Transaction tags |
| `payees` | Transaction payees |
| `transactions` | Financial transactions |
| `account_categories` | Account-category mappings |
| `account_tags` | Account-tag mappings |
| `transaction_tags` | Transaction-tag mappings |
| `transaction_attachments` | File attachments |
| `payment_schedules` | Recurring payment schedules |
| `payment_schedule_occurrences` | Schedule occurrence tracking |
| `investments` | Investment accounts |
| `sync_targets` | Remote sync configurations |
| `sync_jobs` | Sync job tracking |

---

## Migration Status

### Done
- `@midas/core` package created as a CommonJS workspace package (consumable by the CJS backend).
- Database schema, connection (`db`/`sqliteDb`), storage abstraction, and recurrence logic moved to core.
- All business logic extracted from `backend/src/routes/` into `core/src/services/`:
  - `binders`, `accounts`, `transactions`, `categories`, `payees`, `tags`
  - `payment-schedules`, `reports`, `attachments`, `sync` (incl. the sync engine `performSync`), `binder-io`, `actual-import`, `remote`
- `backend` routes are now thin HTTP adapters that import from `@midas/core` and map errors to HTTP status codes.
- `backend/src/db`, `backend/src/storage`, `backend/src/recurrence.ts`, and `backend/src/services/sync-engine.ts` were deleted (moved to core).
- `drizzle.config.ts` points at `core/src/db/schema.ts`; `scripts/seed.ts` imports schema from `@midas/core/schema`.
- Root scripts build core before backend (packaging/release pipelines included).
- Dev mode: `backend/tsconfig.dev.json` maps `@midas/core` → `../core/src/index.ts` so tsx loads core **source directly** — no core build needed for `npm run dev`, `npm run dev:desktop` (spawns tsx with the dev tsconfig), or the db scripts. Production build (`tsc`) still resolves `@midas/core` from the built `dist/` via the workspace symlink.
- Desktop packaging: `desktop/scripts/copy-backend-deps.js` detects workspace packages (symlinks in `node_modules`) and copies only their `dist/` + `package.json` instead of the whole source tree.

### Not done (future work)
- `@midas/react` (frontend) still talks to the API over HTTP; it does not import `@midas/core` yet.
- `@midas/desktop` still bundles the built backend + its deps; it does not call `@midas/core` directly yet (though the packaged copy of core is now trimmed to `dist/` + `package.json`).
- Production backend build (`npm run build --workspace=backend`) requires `@midas/core` to be built first (`npm run build:core`).

---

## Usage Examples

### Using Core in API (HTTP)

```typescript
// @midas/api/src/routes/accounts.ts
import { listAccounts, createAccount } from '@midas/core';

app.get('/binders/:id/accounts', async (req, reply) => {
  const { accounts, categorySums } = await listAccounts(req.params.id);
  return reply.send({ accounts, categorySums });
});
```

### Using Core Directly (Desktop/Offline)

```typescript
// @midas/desktop or any client
import { listAccounts, createAccount } from '@midas/core';

const { accounts } = await listAccounts(binderId);
const newAccount = await createAccount(binderId, { name: 'Checking', type: 'checking' });
```
