ALTER TABLE "system_area" ADD COLUMN "why" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "system_area" ADD COLUMN "curation_json" jsonb;--> statement-breakpoint
ALTER TABLE "system_area_revision" ADD COLUMN "why" text DEFAULT '' NOT NULL;