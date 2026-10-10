CREATE TABLE "access_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"email" text,
	"created_by" text,
	"wave" text,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"grants_plan" text,
	"grants_until" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "access_invite_code_hash_unique" UNIQUE("code_hash"),
	CONSTRAINT "access_invite_uses_check" CHECK ("access_invite"."uses" >= 0 and "access_invite"."uses" <= "access_invite"."max_uses"),
	CONSTRAINT "access_invite_grants_plan_check" CHECK ("access_invite"."grants_plan" in ('solo', 'studio', 'agency'))
);
--> statement-breakpoint
CREATE TABLE "waitlist_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" text,
	"team_size" text,
	"tools" text,
	"website" text,
	"note" text,
	"locale" text DEFAULT 'en' NOT NULL,
	"source" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"invite_id" text,
	"consent_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"invited_at" timestamp with time zone,
	"joined_at" timestamp with time zone,
	CONSTRAINT "waitlist_entry_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_entry_status_check" CHECK ("waitlist_entry"."status" in ('pending', 'invited', 'joined', 'removed')),
	CONSTRAINT "waitlist_entry_locale_check" CHECK ("waitlist_entry"."locale" in ('en', 'es'))
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "access_invite_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "invites_left" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "access_invite" ADD CONSTRAINT "access_invite_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entry" ADD CONSTRAINT "waitlist_entry_invite_id_access_invite_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."access_invite"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_invite_created_by_idx" ON "access_invite" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "waitlist_entry_queue_idx" ON "waitlist_entry" USING btree ("status","priority","created_at");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_access_invite_id_access_invite_id_fk" FOREIGN KEY ("access_invite_id") REFERENCES "public"."access_invite"("id") ON DELETE set null ON UPDATE no action;