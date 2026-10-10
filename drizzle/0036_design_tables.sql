CREATE TABLE "capture_claim" (
	"key" text PRIMARY KEY NOT NULL,
	"claimed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_doc" (
	"web_key" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"markdown" text NOT NULL,
	"model" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"spec" jsonb,
	"screenshot_url" text,
	"cover_url" text,
	"scroll_url" text,
	"logo_url" text,
	"logo_svg_url" text,
	"shot_h" integer,
	"top_url" text,
	"tile_url" text,
	"thumb_url" text,
	"color" text,
	"icons" jsonb,
	"font_files" jsonb,
	"copy" jsonb,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "design_doc_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "page_shot" (
	"web_key" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"shot_url" text NOT NULL,
	"top_url" text NOT NULL,
	"tile_url" text NOT NULL,
	"thumb_url" text NOT NULL,
	"shot_h" integer NOT NULL,
	"color" text,
	"updated_at" timestamp with time zone NOT NULL
);
