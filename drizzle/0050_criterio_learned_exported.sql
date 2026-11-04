ALTER TABLE "criterio_version" ADD COLUMN "exported" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "project_system" ADD COLUMN "learned" jsonb;--> statement-breakpoint
-- Every version kept before this left the app: that was the only way one was kept
UPDATE "criterio_version" SET "exported" = true;
