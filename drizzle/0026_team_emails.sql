ALTER TABLE "member" ADD COLUMN "digest_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "member" ADD COLUMN "activity_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "digest_emails" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "reply_emails" boolean DEFAULT true NOT NULL;