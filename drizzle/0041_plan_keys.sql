ALTER TABLE "access_invite" DROP CONSTRAINT "access_invite_grants_plan_check";--> statement-breakpoint
ALTER TABLE "billing_account" DROP CONSTRAINT "billing_account_plan_check";--> statement-breakpoint
UPDATE "billing_account" SET "plan" = 'free' WHERE "plan" = 'solo';--> statement-breakpoint
UPDATE "access_invite" SET "grants_plan" = 'free' WHERE "grants_plan" = 'solo';--> statement-breakpoint
ALTER TABLE "billing_account" ALTER COLUMN "plan" SET DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "access_invite" ADD CONSTRAINT "access_invite_grants_plan_check" CHECK ("access_invite"."grants_plan" in ('free', 'personal', 'studio', 'agency'));--> statement-breakpoint
ALTER TABLE "billing_account" ADD CONSTRAINT "billing_account_plan_check" CHECK ("billing_account"."plan" in ('free', 'personal', 'studio', 'agency'));
