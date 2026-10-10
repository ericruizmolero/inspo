DROP INDEX "inspo_item_org_idx";--> statement-breakpoint
CREATE INDEX "inspo_item_org_date_idx" ON "inspo_item" USING btree ("organization_id","date" collate "C","created_at");--> statement-breakpoint
CREATE INDEX "inspo_item_thumbnail_idx" ON "inspo_item" USING btree ("thumbnail_url") WHERE "inspo_item"."thumbnail_url" is not null;