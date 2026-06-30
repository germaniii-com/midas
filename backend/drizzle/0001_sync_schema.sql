ALTER TABLE budget_binders ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE accounts ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE categories ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE tags ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE payees ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE transactions ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE payment_schedules ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE payment_schedule_occurrences ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE transaction_attachments ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
ALTER TABLE investments ADD COLUMN updated_at text DEFAULT '';
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_budget_binders_updated_at AFTER UPDATE ON budget_binders
BEGIN
UPDATE budget_binders SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_accounts_updated_at AFTER UPDATE ON accounts
BEGIN
UPDATE accounts SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_categories_updated_at AFTER UPDATE ON categories
BEGIN
UPDATE categories SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_tags_updated_at AFTER UPDATE ON tags
BEGIN
UPDATE tags SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_payees_updated_at AFTER UPDATE ON payees
BEGIN
UPDATE payees SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_transactions_updated_at AFTER UPDATE ON transactions
BEGIN
UPDATE transactions SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_payment_schedules_updated_at AFTER UPDATE ON payment_schedules
BEGIN
UPDATE payment_schedules SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_payment_schedule_occurrences_updated_at AFTER UPDATE ON payment_schedule_occurrences
BEGIN
UPDATE payment_schedule_occurrences SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_transaction_attachments_updated_at AFTER UPDATE ON transaction_attachments
BEGIN
UPDATE transaction_attachments SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS update_investments_updated_at AFTER UPDATE ON investments
BEGIN
UPDATE investments SET updated_at = datetime('now') WHERE id = NEW.id;
END;
--> statement-breakpoint
CREATE TABLE `sync_targets` (
  `id` text PRIMARY KEY NOT NULL,
  `binder_id` text NOT NULL,
  `host` text NOT NULL,
  `password` text NOT NULL,
  `auto_sync_interval` integer,
  `last_synced_at` text,
  `last_sync_status` text DEFAULT 'idle',
  `last_error` text,
  `created_at` text,
  FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `sync_jobs` (
  `id` text PRIMARY KEY NOT NULL,
  `binder_id` text NOT NULL,
  `target_id` text NOT NULL,
  `status` text NOT NULL DEFAULT 'pending',
  `phase` text NOT NULL DEFAULT 'push',
  `current_table` text,
  `current_offset` integer DEFAULT 0,
  `total_records` integer DEFAULT 0,
  `synced_records` integer DEFAULT 0,
  `error` text,
  `started_at` text,
  `completed_at` text,
  FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`target_id`) REFERENCES `sync_targets`(`id`) ON UPDATE no action ON DELETE cascade
);
