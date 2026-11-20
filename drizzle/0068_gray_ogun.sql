CREATE TABLE "vault_release" (
	"id" text PRIMARY KEY NOT NULL,
	"entry_ids" text[] NOT NULL,
	"sent_by" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "billing_account" ADD COLUMN "plan_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "from_template" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "vault_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "welcome_step" text;--> statement-breakpoint
ALTER TABLE "vault_release" ADD CONSTRAINT "vault_release_sent_by_user_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vault_release_sent_idx" ON "vault_release" USING btree ("sent_at");--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_from_template_project_id_fk" FOREIGN KEY ("from_template") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_welcome_step_check" CHECK ("user"."welcome_step" in ('name', 'first', 'extension', 'agent'));