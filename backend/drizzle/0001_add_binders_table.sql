CREATE TABLE "budget_binders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"currency" varchar(3) DEFAULT 'USD',
	"password_hash" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "budget_binders_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "account_tags" ADD COLUMN "binder_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "binder_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "binder_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payees" ADD COLUMN "binder_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD COLUMN "binder_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "binder_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "binder_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "account_tags" ADD CONSTRAINT "account_tags_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payees" ADD CONSTRAINT "payees_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_schedules" ADD CONSTRAINT "payment_schedules_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;