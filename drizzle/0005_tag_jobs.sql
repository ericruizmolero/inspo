ALTER TABLE "inspo_item" ADD COLUMN "tags_user" jsonb;--> statement-breakpoint
ALTER TABLE "inspo_item" ADD COLUMN "tag_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "inspo_item" ADD COLUMN "tag_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inspo_item" ADD COLUMN "tag_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "inspo_item" ADD COLUMN "tag_error" text;--> statement-breakpoint
CREATE INDEX "inspo_item_tag_status_idx" ON "inspo_item" USING btree ("tag_status") WHERE "inspo_item"."tag_status" <> 'done';--> statement-breakpoint
ALTER TABLE "inspo_item" ADD CONSTRAINT "inspo_item_tag_status_check" CHECK ("inspo_item"."tag_status" in ('pending', 'running', 'done', 'failed'));--> statement-breakpoint
-- Items already tagged with the current taxonomy (v3) have nothing left to do
UPDATE "inspo_item" SET "tag_status" = 'done' WHERE ("tags_json"->>'v')::int = 3;