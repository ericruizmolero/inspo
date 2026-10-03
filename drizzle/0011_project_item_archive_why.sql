ALTER TABLE "project_item" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "project_item" ADD COLUMN IF NOT EXISTS "why" jsonb;