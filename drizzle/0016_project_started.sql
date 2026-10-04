ALTER TABLE "project" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
-- Projects already under way keep opening on their system: the ones a person has decided something in, and the ones started from a template
UPDATE "project" SET "started_at" = "updated_at" WHERE "template" IS NULL AND ("recipe" <> '' OR "id" IN (SELECT "project_id" FROM "system_area" WHERE "source" = 'team'));
