CREATE TABLE "plan_request" (
	"id" text PRIMARY KEY NOT NULL,
	"billing_account_id" text NOT NULL,
	"requested_by" text,
	"plan" text NOT NULL,
	"period" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by" text,
	CONSTRAINT "plan_request_plan_check" CHECK ("plan_request"."plan" in ('free', 'duo', 'studio', 'agency')),
	CONSTRAINT "plan_request_period_check" CHECK ("plan_request"."period" in ('month', 'year')),
	CONSTRAINT "plan_request_status_check" CHECK ("plan_request"."status" in ('open', 'done', 'declined'))
);
--> statement-breakpoint
ALTER TABLE "access_invite" DROP CONSTRAINT "access_invite_grants_plan_check";--> statement-breakpoint
ALTER TABLE "billing_account" DROP CONSTRAINT "billing_account_plan_check";--> statement-breakpoint
UPDATE "billing_account" SET "plan" = 'duo' WHERE "plan" = 'personal';--> statement-breakpoint
UPDATE "access_invite" SET "grants_plan" = 'duo' WHERE "grants_plan" = 'personal';--> statement-breakpoint
ALTER TABLE "vault_item" ADD COLUMN "access" text DEFAULT 'paid' NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_request" ADD CONSTRAINT "plan_request_billing_account_id_billing_account_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_account"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_request" ADD CONSTRAINT "plan_request_requested_by_user_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_request" ADD CONSTRAINT "plan_request_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_request_queue_idx" ON "plan_request" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "plan_request_billing_account_idx" ON "plan_request" USING btree ("billing_account_id");--> statement-breakpoint
ALTER TABLE "access_invite" ADD CONSTRAINT "access_invite_grants_plan_check" CHECK ("access_invite"."grants_plan" in ('free', 'duo', 'studio', 'agency'));--> statement-breakpoint
ALTER TABLE "billing_account" ADD CONSTRAINT "billing_account_plan_check" CHECK ("billing_account"."plan" in ('free', 'duo', 'studio', 'agency'));--> statement-breakpoint
ALTER TABLE "vault_item" ADD CONSTRAINT "vault_item_access_check" CHECK ("vault_item"."access" in ('paid', 'free'));