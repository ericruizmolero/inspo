CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_segment" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"visit_id" text NOT NULL,
	"area" text NOT NULL,
	"path" text NOT NULL,
	"device" text,
	"started_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"seconds" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"cache_read_tokens" integer DEFAULT 0 NOT NULL,
	"units" integer DEFAULT 0 NOT NULL,
	"cost_micros" integer DEFAULT 0 NOT NULL,
	"cost_source" text DEFAULT 'estimated' NOT NULL,
	"provider" text,
	"request_id" text,
	"ref" text,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "ai_usage_action_check" CHECK ("ai_usage"."action" in ('design_md', 'vision', 'jev_tag', 'jev_search', 'jev_directory', 'explain', 'revise', 'design_why')),
	CONSTRAINT "ai_usage_cost_source_check" CHECK ("ai_usage"."cost_source" in ('real', 'estimated'))
);
--> statement-breakpoint
CREATE TABLE "app_admin" (
	"email" text PRIMARY KEY NOT NULL,
	"added_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "design_revision" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"url" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"kind" text DEFAULT 'revision' NOT NULL,
	"section" text,
	"comment" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"warning" text,
	"spec_json" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "design_revision_kind_check" CHECK ("design_revision"."kind" in ('regeneration', 'revision', 'reversion'))
);
--> statement-breakpoint
CREATE TABLE "design_why" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"url" text NOT NULL,
	"stamp" text NOT NULL,
	"model" text NOT NULL,
	"why_json" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ext_key" (
	"id" text PRIMARY KEY NOT NULL,
	"hash" text NOT NULL,
	"prefix" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "feedback_note" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text,
	"path" text NOT NULL,
	"url" text NOT NULL,
	"viewport" text,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inspo_comment" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"item_id" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"body" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"edited_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "inspo_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"web" text NOT NULL,
	"web_key" text NOT NULL,
	"date" text NOT NULL,
	"type" text DEFAULT 'inspiration' NOT NULL,
	"author" text NOT NULL,
	"created_by" text,
	"note" text DEFAULT '' NOT NULL,
	"sub_note" text,
	"thumbnail_url" text,
	"tags_json" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "inspo_item_type_check" CHECK ("inspo_item"."type" in ('inspiration', 'videos', 'ideas', 'documentaries'))
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"team_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL,
	CONSTRAINT "invitation_role_check" CHECK ("invitation"."role" ~ '^(owner|admin|member)(,(owner|admin|member))*$'),
	CONSTRAINT "invitation_status_check" CHECK ("invitation"."status" in ('pending', 'accepted', 'rejected', 'canceled'))
);
--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "member_role_check" CHECK ("member"."role" ~ '^(owner|admin|member)(,(owner|admin|member))*$')
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"logo" text,
	"created_at" timestamp with time zone NOT NULL,
	"metadata" text,
	"kind" text DEFAULT 'team' NOT NULL,
	"plan" text DEFAULT 'solo' NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug"),
	CONSTRAINT "organization_kind_check" CHECK ("organization"."kind" in ('personal', 'team')),
	CONSTRAINT "organization_plan_check" CHECK ("organization"."plan" in ('solo', 'studio', 'agency'))
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	"active_team_id" text,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"language" text DEFAULT 'en' NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_segment" ADD CONSTRAINT "activity_segment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_segment" ADD CONSTRAINT "activity_segment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_revision" ADD CONSTRAINT "design_revision_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_revision" ADD CONSTRAINT "design_revision_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "design_why" ADD CONSTRAINT "design_why_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ext_key" ADD CONSTRAINT "ext_key_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ext_key" ADD CONSTRAINT "ext_key_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_note" ADD CONSTRAINT "feedback_note_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feedback_note" ADD CONSTRAINT "feedback_note_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD CONSTRAINT "inspo_comment_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD CONSTRAINT "inspo_comment_item_id_inspo_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inspo_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspo_comment" ADD CONSTRAINT "inspo_comment_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspo_item" ADD CONSTRAINT "inspo_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inspo_item" ADD CONSTRAINT "inspo_item_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_segment_user_seen_idx" ON "activity_segment" USING btree ("user_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "activity_segment_seen_idx" ON "activity_segment" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "activity_segment_org_idx" ON "activity_segment" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ai_usage_org_created_idx" ON "ai_usage" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_org_action_created_idx" ON "ai_usage" USING btree ("organization_id","action","created_at");--> statement-breakpoint
CREATE INDEX "ai_usage_user_id_idx" ON "ai_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "design_revision_org_url_idx" ON "design_revision" USING btree ("organization_id","url");--> statement-breakpoint
CREATE INDEX "design_revision_author_id_idx" ON "design_revision" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "design_why_org_url_idx" ON "design_why" USING btree ("organization_id","url");--> statement-breakpoint
CREATE UNIQUE INDEX "ext_key_hash_idx" ON "ext_key" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "ext_key_org_idx" ON "ext_key" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "ext_key_user_idx" ON "ext_key" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_note_pending_idx" ON "feedback_note" USING btree ("sent_at","updated_at");--> statement-breakpoint
CREATE INDEX "feedback_note_user_path_idx" ON "feedback_note" USING btree ("user_id","path");--> statement-breakpoint
CREATE INDEX "feedback_note_org_idx" ON "feedback_note" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "inspo_comment_org_item_idx" ON "inspo_comment" USING btree ("organization_id","item_id");--> statement-breakpoint
CREATE INDEX "inspo_comment_item_id_idx" ON "inspo_comment" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "inspo_comment_author_id_idx" ON "inspo_comment" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "inspo_item_org_idx" ON "inspo_item" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inspo_item_org_web_uq" ON "inspo_item" USING btree ("organization_id","web_key");--> statement-breakpoint
CREATE INDEX "inspo_item_created_by_idx" ON "inspo_item" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "invitation_organization_id_idx" ON "invitation" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "invitation_email_idx" ON "invitation" USING btree ("email");--> statement-breakpoint
CREATE INDEX "invitation_inviter_id_idx" ON "invitation" USING btree ("inviter_id");--> statement-breakpoint
CREATE INDEX "member_organization_id_idx" ON "member" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "member_user_id_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "member_org_user_uq" ON "member" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");