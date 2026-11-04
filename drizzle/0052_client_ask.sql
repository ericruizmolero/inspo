CREATE TABLE "client_ask" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"project_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"answered_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "client_ask" ADD CONSTRAINT "client_ask_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_ask" ADD CONSTRAINT "client_ask_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_ask" ADD CONSTRAINT "client_ask_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "client_ask_token_idx" ON "client_ask" USING btree ("token");--> statement-breakpoint
CREATE INDEX "client_ask_project_idx" ON "client_ask" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "client_ask_org_idx" ON "client_ask" USING btree ("organization_id");