CREATE TABLE "stripe_event" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription" (
	"id" text PRIMARY KEY NOT NULL,
	"billing_account_id" text NOT NULL,
	"price_key" text NOT NULL,
	"plan" text NOT NULL,
	"period" text NOT NULL,
	"status" text NOT NULL,
	"current_period_start" timestamp with time zone,
	"current_period_end" timestamp with time zone,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscription_billing_account_id_unique" UNIQUE("billing_account_id"),
	CONSTRAINT "subscription_plan_check" CHECK ("subscription"."plan" in ('free', 'duo', 'studio', 'agency')),
	CONSTRAINT "subscription_period_check" CHECK ("subscription"."period" in ('month', 'year'))
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_billing_account_id_billing_account_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_account"("id") ON DELETE cascade ON UPDATE no action;