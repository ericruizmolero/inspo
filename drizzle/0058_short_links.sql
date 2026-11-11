CREATE TABLE "short_link" (
	"code" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"inside" text DEFAULT '' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "short_link" ADD CONSTRAINT "short_link_item_id_inspo_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspo_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "short_link" ADD CONSTRAINT "short_link_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "short_link_item_inside_idx" ON "short_link" USING btree ("item_id","inside");