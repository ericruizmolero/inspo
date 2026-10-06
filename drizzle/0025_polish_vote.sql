CREATE TABLE "polish_vote" (
	"project_id" text NOT NULL,
	"item_id" text NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"vote" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" text,
	CONSTRAINT "polish_vote_project_id_item_id_user_id_pk" PRIMARY KEY("project_id","item_id","user_id"),
	CONSTRAINT "polish_vote_vote_check" CHECK ("polish_vote"."vote" in ('keep', 'forget'))
);
--> statement-breakpoint
ALTER TABLE "polish_vote" ADD CONSTRAINT "polish_vote_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polish_vote" ADD CONSTRAINT "polish_vote_item_id_inspo_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspo_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polish_vote" ADD CONSTRAINT "polish_vote_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polish_vote" ADD CONSTRAINT "polish_vote_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polish_vote" ADD CONSTRAINT "polish_vote_closed_by_user_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "polish_vote_org_idx" ON "polish_vote" USING btree ("organization_id");