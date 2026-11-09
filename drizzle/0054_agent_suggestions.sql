CREATE TABLE "project_suggestion" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"project_id" text NOT NULL,
	"kind" text NOT NULL,
	"key" text NOT NULL,
	"state" text DEFAULT 'open' NOT NULL,
	"item_id" text,
	"made_item" boolean DEFAULT false NOT NULL,
	"role" text,
	"note" text DEFAULT '' NOT NULL,
	"areas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"origin" text DEFAULT '' NOT NULL,
	"via" text,
	"by_name" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "project_suggestion_kind_check" CHECK ("project_suggestion"."kind" in ('reference', 'answer', 'outline')),
	CONSTRAINT "project_suggestion_state_check" CHECK ("project_suggestion"."state" in ('open', 'dismissed'))
);
--> statement-breakpoint
ALTER TABLE "project_item" ADD COLUMN "role" text;--> statement-breakpoint
ALTER TABLE "project_suggestion" ADD CONSTRAINT "project_suggestion_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suggestion" ADD CONSTRAINT "project_suggestion_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suggestion" ADD CONSTRAINT "project_suggestion_item_id_inspo_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspo_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_suggestion" ADD CONSTRAINT "project_suggestion_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_suggestion_key_uq" ON "project_suggestion" USING btree ("project_id","key");--> statement-breakpoint
CREATE INDEX "project_suggestion_org_idx" ON "project_suggestion" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "project_suggestion_item_idx" ON "project_suggestion" USING btree ("item_id");