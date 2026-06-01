CREATE TABLE "account_categories" (
	"binder_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "account_categories_account_id_category_id_pk" PRIMARY KEY("account_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"binder_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account_categories" ADD CONSTRAINT "account_categories_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_categories" ADD CONSTRAINT "account_categories_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account_categories" ADD CONSTRAINT "account_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_binder_id_budget_binders_id_fk" FOREIGN KEY ("binder_id") REFERENCES "public"."budget_binders"("id") ON DELETE cascade ON UPDATE no action;