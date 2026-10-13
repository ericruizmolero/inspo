CREATE TABLE "criterio_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"n" integer NOT NULL,
	"markdown" text NOT NULL,
	"hash" text NOT NULL,
	"changed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"by_name" text,
	"via" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "criterio_version" ADD CONSTRAINT "criterio_version_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterio_version" ADD CONSTRAINT "criterio_version_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "criterio_version_project_n_idx" ON "criterio_version" USING btree ("project_id","n");--> statement-breakpoint
CREATE INDEX "criterio_version_org_idx" ON "criterio_version" USING btree ("organization_id");