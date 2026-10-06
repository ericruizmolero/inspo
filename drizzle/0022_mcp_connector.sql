CREATE TABLE "mcp_client" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"redirect_uris" jsonb NOT NULL,
	"secret_hash" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_grant" (
	"id" text PRIMARY KEY NOT NULL,
	"client_id" text NOT NULL,
	"user_id" text NOT NULL,
	"code_hash" text NOT NULL,
	"code_expires_at" timestamp with time zone NOT NULL,
	"code_used_at" timestamp with time zone,
	"code_challenge" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"access_hash" text,
	"access_expires_at" timestamp with time zone,
	"refresh_hash" text,
	"refresh_expires_at" timestamp with time zone,
	"prev_refresh_hash" text,
	"rotated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "inspo_item" ADD COLUMN "via" text;--> statement-breakpoint
ALTER TABLE "mcp_grant" ADD CONSTRAINT "mcp_grant_client_id_mcp_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."mcp_client"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_grant" ADD CONSTRAINT "mcp_grant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mcp_client_created_idx" ON "mcp_client" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_grant_code_idx" ON "mcp_grant" USING btree ("code_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_grant_access_idx" ON "mcp_grant" USING btree ("access_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "mcp_grant_refresh_idx" ON "mcp_grant" USING btree ("refresh_hash");--> statement-breakpoint
CREATE INDEX "mcp_grant_prev_refresh_idx" ON "mcp_grant" USING btree ("prev_refresh_hash");--> statement-breakpoint
CREATE INDEX "mcp_grant_user_idx" ON "mcp_grant" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "mcp_grant_client_idx" ON "mcp_grant" USING btree ("client_id");