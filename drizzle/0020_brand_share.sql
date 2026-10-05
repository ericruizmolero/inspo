CREATE TABLE "system_share" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"mode" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	CONSTRAINT "system_share_mode_check" CHECK ("system_share"."mode" in ('clean', 'full'))
);
--> statement-breakpoint
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_action_check";--> statement-breakpoint
ALTER TABLE "project_system" ADD COLUMN "brand" jsonb;--> statement-breakpoint
ALTER TABLE "system_share" ADD CONSTRAINT "system_share_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_share" ADD CONSTRAINT "system_share_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_share" ADD CONSTRAINT "system_share_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "system_share_token_idx" ON "system_share" USING btree ("token");--> statement-breakpoint
CREATE INDEX "system_share_project_idx" ON "system_share" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "system_share_org_idx" ON "system_share" USING btree ("organization_id");--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_action_check" CHECK ("ai_usage"."action" in ('design_md', 'vision', 'jev_tag', 'jev_search', 'jev_directory', 'explain', 'revise', 'design_why', 'polish', 'auto_tag', 'query_en', 'embed', 'system', 'brand'));