CREATE TABLE `account_categories` (
	`binder_id` text NOT NULL,
	`account_id` text NOT NULL,
	`category_id` text NOT NULL,
	PRIMARY KEY(`account_id`, `category_id`),
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `account_tags` (
	`binder_id` text NOT NULL,
	`account_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`account_id`, `tag_id`),
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `budget_binders` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`currency` text DEFAULT 'USD',
	`password_hash` text NOT NULL,
	`created_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `budget_binders_name_unique` ON `budget_binders` (`name`);--> statement-breakpoint
CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `investments` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`account_id` text NOT NULL,
	`principal_amount` text DEFAULT '0.00' NOT NULL,
	`interest_rate` text NOT NULL,
	`interest_period` text NOT NULL,
	`compounding_frequency` text NOT NULL,
	`tax_rate` text DEFAULT '0.0000',
	`start_date` text NOT NULL,
	`maturity_date` text,
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payees` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `payment_schedule_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`schedule_id` text NOT NULL,
	`due_date` text NOT NULL,
	`transaction_id` text,
	`paid_at` text,
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`schedule_id`) REFERENCES `payment_schedules`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_schedule_occurrences_schedule_id_due_date_unique` ON `payment_schedule_occurrences` (`schedule_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `payment_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`name` text NOT NULL,
	`account_id` text NOT NULL,
	`payee_id` text,
	`amount` text NOT NULL,
	`repeat_interval` integer DEFAULT 1 NOT NULL,
	`repeat_type` text NOT NULL,
	`start_date` text NOT NULL,
	`end_type` text DEFAULT 'never' NOT NULL,
	`end_date` text,
	`end_occurrences` integer,
	`specific_days` text,
	`weekend_adjustment` text DEFAULT 'none' NOT NULL,
	`notify_before` integer DEFAULT 7 NOT NULL,
	`notify_type` text DEFAULT 'days',
	`is_active` integer DEFAULT true,
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payees`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `tags` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text DEFAULT '#3B82F6',
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transaction_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`transaction_id` text NOT NULL,
	`binder_id` text NOT NULL,
	`file_name` text NOT NULL,
	`object_name` text NOT NULL,
	`mime_type` text,
	`file_size` integer,
	`created_at` text,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transaction_tags` (
	`binder_id` text NOT NULL,
	`transaction_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`transaction_id`, `tag_id`),
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`binder_id` text NOT NULL,
	`account_id` text NOT NULL,
	`payee_id` text,
	`transfer_id` text,
	`amount` text NOT NULL,
	`date` text NOT NULL,
	`notes` text,
	`is_cleared` integer DEFAULT false,
	`created_at` text,
	FOREIGN KEY (`binder_id`) REFERENCES `budget_binders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payee_id`) REFERENCES `payees`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`transfer_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE set null
);
