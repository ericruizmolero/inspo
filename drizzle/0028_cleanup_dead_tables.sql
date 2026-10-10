ALTER TABLE "canvas_position" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "canvas_position" CASCADE;--> statement-breakpoint
ALTER TABLE "inspo_comment" DROP CONSTRAINT "inspo_comment_anchor_check";--> statement-breakpoint
ALTER TABLE "inspo_comment" DROP CONSTRAINT "inspo_comment_reply_check";--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "brief" jsonb;--> statement-breakpoint
UPDATE "project" SET "brief" = "polish"->'brief' WHERE jsonb_typeof("polish"->'brief') = 'object';--> statement-breakpoint
ALTER TABLE "inspo_comment" DROP COLUMN "anchor_x";--> statement-breakpoint
ALTER TABLE "inspo_comment" DROP COLUMN "anchor_y";--> statement-breakpoint
ALTER TABLE "inspo_comment" DROP COLUMN "anchor_h";--> statement-breakpoint
ALTER TABLE "project_item" DROP COLUMN "why";