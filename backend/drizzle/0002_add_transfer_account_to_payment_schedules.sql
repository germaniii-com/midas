ALTER TABLE `payment_schedules` ADD `transfer_account_id` text REFERENCES `accounts`(`id`) ON DELETE SET NULL;
