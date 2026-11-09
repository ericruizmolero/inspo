CREATE TABLE "board_version" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"n" integer NOT NULL,
	"item_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"added" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"removed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"by_name" text,
	"by_id" text,
	"via" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "board_version" ADD CONSTRAINT "board_version_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_version" ADD CONSTRAINT "board_version_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board_version" ADD CONSTRAINT "board_version_by_id_user_id_fk" FOREIGN KEY ("by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "board_version_project_n_idx" ON "board_version" USING btree ("project_id","n");--> statement-breakpoint
CREATE INDEX "board_version_org_idx" ON "board_version" USING btree ("organization_id");