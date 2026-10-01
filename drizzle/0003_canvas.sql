CREATE TABLE "canvas_position" (
	"organization_id" text NOT NULL,
	"space" text NOT NULL,
	"item_id" text NOT NULL,
	"x" real NOT NULL,
	"y" real NOT NULL,
	"updated_by" text,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "canvas_position_organization_id_space_item_id_pk" PRIMARY KEY("organization_id","space","item_id")
);
--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD COLUMN "anchor_x" real;--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD COLUMN "anchor_y" real;--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD COLUMN "anchor_h" integer;--> statement-breakpoint
ALTER TABLE "canvas_position" ADD CONSTRAINT "canvas_position_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_position" ADD CONSTRAINT "canvas_position_item_id_inspo_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspo_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "canvas_position" ADD CONSTRAINT "canvas_position_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "canvas_position_item_idx" ON "canvas_position" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "canvas_position_updated_by_idx" ON "canvas_position" USING btree ("updated_by");--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD CONSTRAINT "inspo_comment_anchor_check" CHECK (("inspo_comment"."anchor_x" is null) = ("inspo_comment"."anchor_y" is null) and ("inspo_comment"."anchor_x" is null) = ("inspo_comment"."anchor_h" is null));