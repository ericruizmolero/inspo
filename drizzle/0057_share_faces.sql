CREATE TABLE "share_face" (
	"share_id" text NOT NULL,
	"guest_key" text NOT NULL,
	"image" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "share_face_share_id_guest_key_pk" PRIMARY KEY("share_id","guest_key")
);
--> statement-breakpoint
ALTER TABLE "system_share" ADD COLUMN "subtitle" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "share_face" ADD CONSTRAINT "share_face_share_id_system_share_id_fk" FOREIGN KEY ("share_id") REFERENCES "public"."system_share"("id") ON DELETE cascade ON UPDATE no action;