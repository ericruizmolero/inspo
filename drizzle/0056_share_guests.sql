CREATE TABLE "share_guest" (
	"id" text PRIMARY KEY NOT NULL,
	"share_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "share_pick" (
	"share_id" text NOT NULL,
	"item_id" text NOT NULL,
	"guest_key" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "share_pick_share_id_guest_key_item_id_pk" PRIMARY KEY("share_id","guest_key","item_id")
);
--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD COLUMN "guest_key" text;--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD COLUMN "share_id" text;--> statement-breakpoint
ALTER TABLE "system_share" ADD COLUMN "item_ids" jsonb;--> statement-breakpoint
ALTER TABLE "system_share" ADD COLUMN "access" text DEFAULT 'link' NOT NULL;--> statement-breakpoint
ALTER TABLE "share_guest" ADD CONSTRAINT "share_guest_share_id_system_share_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."system_share"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_guest" ADD CONSTRAINT "share_guest_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_pick" ADD CONSTRAINT "share_pick_share_id_system_share_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."system_share"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_pick" ADD CONSTRAINT "share_pick_item_id_inspo_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspo_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "share_guest_token_idx" ON "share_guest" USING btree ("token");--> statement-breakpoint
CREATE INDEX "share_guest_share_idx" ON "share_guest" USING btree ("share_id");--> statement-breakpoint
CREATE INDEX "share_guest_org_idx" ON "share_guest" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "share_pick_item_idx" ON "share_pick" USING btree ("item_id");--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD CONSTRAINT "inspo_comment_share_id_system_share_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."system_share"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_share" ADD CONSTRAINT "system_share_access_check" CHECK ("system_share"."access" in ('link', 'invite'));