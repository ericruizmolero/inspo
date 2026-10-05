ALTER TABLE "organization" ADD COLUMN "output_language" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_output_language_check" CHECK ("organization"."output_language" in ('en', 'es', 'fr', 'de', 'it', 'pt-PT', 'pt-BR', 'nl', 'ca', 'ja', 'zh', 'ko'));--> statement-breakpoint
-- Each workspace starts in its owner's language (the earliest owner, when there are several)
UPDATE "organization" o SET "output_language" = u."language"
FROM (
  SELECT DISTINCT ON (m."organization_id") m."organization_id", us."language"
  FROM "member" m JOIN "user" us ON us."id" = m."user_id"
  WHERE m."role" LIKE '%owner%'
  ORDER BY m."organization_id", m."created_at"
) u
WHERE u."organization_id" = o."id" AND u."language" IN ('en', 'es');
