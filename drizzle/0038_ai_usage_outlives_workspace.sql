ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_organization_id_organization_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_usage" ALTER COLUMN "organization_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD COLUMN "organization_name" text;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE FUNCTION "ai_usage_keep_workspace_name"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
	UPDATE "ai_usage" SET "organization_name" = OLD."name" WHERE "organization_id" = OLD."id";
	RETURN OLD;
END;
$$;--> statement-breakpoint
CREATE TRIGGER "organization_keeps_ai_usage" BEFORE DELETE ON "organization" FOR EACH ROW EXECUTE FUNCTION "ai_usage_keep_workspace_name"();
