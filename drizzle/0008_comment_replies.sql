ALTER TABLE "inspo_comment" ADD COLUMN "parent_id" text;--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD CONSTRAINT "inspo_comment_parent_id_inspo_comment_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."inspo_comment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inspo_comment_parent_id_idx" ON "inspo_comment" USING btree ("parent_id");--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD CONSTRAINT "inspo_comment_reply_check" CHECK ("inspo_comment"."parent_id" is null or "inspo_comment"."anchor_x" is null);