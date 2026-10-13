CREATE TABLE "criterio_result" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"page" text NOT NULL,
	"version_n" integer,
	"status" text NOT NULL,
	"html" text DEFAULT '' NOT NULL,
	"model" text,
	"by_name" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "criterio_result_status_check" CHECK ("criterio_result"."status" in ('running', 'done', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_action_check";--> statement-breakpoint
ALTER TABLE "criterio_result" ADD CONSTRAINT "criterio_result_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "criterio_result" ADD CONSTRAINT "criterio_result_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "criterio_result_project_idx" ON "criterio_result" USING btree ("project_id","created_at");--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_action_check" CHECK ("ai_usage"."action" in ('design_md', 'vision', 'jev_tag', 'jev_search', 'jev_directory', 'explain', 'revise', 'design_why', 'polish', 'auto_tag', 'query_en', 'embed', 'system', 'brand', 'result'));