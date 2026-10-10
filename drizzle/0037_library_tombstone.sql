CREATE TABLE "library_tombstone" (
	"organization_id" text NOT NULL,
	"kind" text NOT NULL,
	"id" text NOT NULL,
	"deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_tombstone_kind_check" CHECK ("library_tombstone"."kind" in ('item', 'comment'))
);
--> statement-breakpoint
CREATE INDEX "library_tombstone_org_deleted_idx" ON "library_tombstone" USING btree ("organization_id","deleted_at");--> statement-breakpoint
CREATE FUNCTION "library_tombstone_write"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	INSERT INTO "library_tombstone" ("organization_id", "kind", "id") VALUES (OLD."organization_id", TG_ARGV[0], OLD."id");
	RETURN NULL;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "inspo_item_tombstone" AFTER DELETE ON "inspo_item" FOR EACH ROW EXECUTE FUNCTION "library_tombstone_write"('item');--> statement-breakpoint
CREATE TRIGGER "inspo_comment_tombstone" AFTER DELETE ON "inspo_comment" FOR EACH ROW EXECUTE FUNCTION "library_tombstone_write"('comment');
