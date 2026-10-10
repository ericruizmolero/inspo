CREATE TABLE "failure" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"what" text NOT NULL,
	"message" text NOT NULL,
	"stack" text,
	"request_id" text,
	"user_id" text,
	"organization_id" text,
	"ref" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "failure_kind_check" CHECK ("failure"."kind" in ('ai', 'shot', 'mail', 'job', 'action', 'mcp', 'storage'))
);
--> statement-breakpoint
ALTER TABLE "failure" ADD CONSTRAINT "failure_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "failure" ADD CONSTRAINT "failure_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "failure_created_idx" ON "failure" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "failure_user_created_idx" ON "failure" USING btree ("user_id","created_at");