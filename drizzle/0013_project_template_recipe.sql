ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "template" jsonb;--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "recipe" text DEFAULT '' NOT NULL;