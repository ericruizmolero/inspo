CREATE TABLE "billing_account" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"plan" text DEFAULT 'solo' NOT NULL,
	"owner_user_id" text,
	"stripe_customer_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_account_plan_check" CHECK ("billing_account"."plan" in ('solo', 'studio', 'agency'))
);
--> statement-breakpoint
ALTER TABLE "billing_account" ADD CONSTRAINT "billing_account_owner_user_id_user_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "billing_account_owner_idx" ON "billing_account" USING btree ("owner_user_id");--> statement-breakpoint
-- One account per existing workspace, on the plan the workspace had, owned by its first owner
INSERT INTO "billing_account" ("id", "name", "plan", "owner_user_id", "created_at")
SELECT substr(md5('billing:' || o."id"), 1, 24), o."name", o."plan",
	(SELECT m."user_id" FROM "member" m WHERE m."organization_id" = o."id" AND m."role" LIKE '%owner%' ORDER BY m."created_at", m."id" LIMIT 1),
	o."created_at"
FROM "organization" o;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "billing_account_id" text;--> statement-breakpoint
UPDATE "organization" SET "billing_account_id" = substr(md5('billing:' || "id"), 1, 24);--> statement-breakpoint
ALTER TABLE "organization" ALTER COLUMN "billing_account_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_billing_account_id_billing_account_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "public"."billing_account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_billing_account_idx" ON "organization" USING btree ("billing_account_id");--> statement-breakpoint
ALTER TABLE "organization" DROP CONSTRAINT "organization_plan_check";--> statement-breakpoint
ALTER TABLE "organization" DROP COLUMN "plan";
