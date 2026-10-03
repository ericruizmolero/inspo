CREATE TABLE "system_area_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"area" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "system_area_comment_area_check" CHECK ("system_area_comment"."area" in ('typography', 'color', 'layout', 'motion', 'iconography', 'logo', 'imagery', 'voice'))
);
--> statement-breakpoint
ALTER TABLE "system_area_comment" ADD CONSTRAINT "system_area_comment_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_area_comment" ADD CONSTRAINT "system_area_comment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_area_comment" ADD CONSTRAINT "system_area_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "system_area_comment_project_idx" ON "system_area_comment" USING btree ("project_id","area","created_at");--> statement-breakpoint
CREATE INDEX "system_area_comment_org_idx" ON "system_area_comment" USING btree ("organization_id");