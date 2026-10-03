ALTER TABLE "project_item" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_item" ADD COLUMN "why" jsonb;