CREATE TABLE "stored_file" (
	"key" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"bytes" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stored_file" ADD CONSTRAINT "stored_file_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "stored_file_org_idx" ON "stored_file" USING btree ("organization_id");