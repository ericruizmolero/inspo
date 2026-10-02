-- Written so it can run on a database that already has these tables (the shared preview database got an
-- earlier version of this migration): everything is created only if missing. On production it runs clean.
CREATE TABLE IF NOT EXISTS "project_system" (
	"project_id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"run_json" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_area" (
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"area" text NOT NULL,
	"decision" text DEFAULT '' NOT NULL,
	"confidence" integer DEFAULT 0 NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text,
	"decided_by" text,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "system_area_project_id_area_pk" PRIMARY KEY("project_id","area"),
	CONSTRAINT "system_area_area_check" CHECK ("system_area"."area" in ('typography', 'color', 'layout', 'motion', 'iconography', 'logo', 'imagery', 'voice')),
	CONSTRAINT "system_area_source_check" CHECK ("system_area"."source" is null or "system_area"."source" in ('model', 'team')),
	CONSTRAINT "system_area_confidence_check" CHECK ("system_area"."confidence" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_area_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"area" text NOT NULL,
	"decision" text NOT NULL,
	"confidence" integer NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "system_area_revision_source_check" CHECK ("system_area_revision"."source" in ('model', 'team'))
);
--> statement-breakpoint
ALTER TABLE "ai_usage" DROP CONSTRAINT IF EXISTS "ai_usage_action_check";--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_system_project_id_project_id_fk') THEN
    ALTER TABLE "project_system" ADD CONSTRAINT "project_system_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_system_organization_id_organization_id_fk') THEN
    ALTER TABLE "project_system" ADD CONSTRAINT "project_system_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_area_project_id_project_id_fk') THEN
    ALTER TABLE "system_area" ADD CONSTRAINT "system_area_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_area_organization_id_organization_id_fk') THEN
    ALTER TABLE "system_area" ADD CONSTRAINT "system_area_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_area_decided_by_user_id_fk') THEN
    ALTER TABLE "system_area" ADD CONSTRAINT "system_area_decided_by_user_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_area_revision_project_id_project_id_fk') THEN
    ALTER TABLE "system_area_revision" ADD CONSTRAINT "system_area_revision_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_area_revision_organization_id_organization_id_fk') THEN
    ALTER TABLE "system_area_revision" ADD CONSTRAINT "system_area_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_area_revision_author_id_user_id_fk') THEN
    ALTER TABLE "system_area_revision" ADD CONSTRAINT "system_area_revision_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_system_org_idx" ON "project_system" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_area_org_idx" ON "system_area" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_area_revision_project_idx" ON "system_area_revision" USING btree ("project_id","area","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_area_revision_org_idx" ON "system_area_revision" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "system_area_revision_author_idx" ON "system_area_revision" USING btree ("author_id");--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_action_check" CHECK ("ai_usage"."action" in ('design_md', 'vision', 'jev_tag', 'jev_search', 'jev_directory', 'explain', 'revise', 'design_why', 'polish', 'auto_tag', 'query_en', 'embed', 'system'));