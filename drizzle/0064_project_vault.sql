CREATE TABLE "project_vault" (
	"project_id" text NOT NULL,
	"vault_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"added_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_vault_project_id_vault_id_pk" PRIMARY KEY("project_id","vault_id")
);
--> statement-breakpoint
ALTER TABLE "project_vault" ADD CONSTRAINT "project_vault_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_vault" ADD CONSTRAINT "project_vault_vault_id_vault_item_id_fk" FOREIGN KEY ("vault_id") REFERENCES "public"."vault_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_vault" ADD CONSTRAINT "project_vault_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_vault" ADD CONSTRAINT "project_vault_added_by_user_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_vault_org_idx" ON "project_vault" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_vault_vault_idx" ON "project_vault" USING btree ("vault_id");