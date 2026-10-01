-- pgvector: Neon has it, and a local Postgres needs it installed (DBngin ships it)
CREATE EXTENSION IF NOT EXISTS vector;--> statement-breakpoint
ALTER TABLE "ai_usage" DROP CONSTRAINT "ai_usage_action_check";--> statement-breakpoint
ALTER TABLE "inspo_item" ADD COLUMN "embedding" vector(1024);--> statement-breakpoint
ALTER TABLE "inspo_item" ADD COLUMN "embedding_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "inspo_item_embedding_idx" ON "inspo_item" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_action_check" CHECK ("ai_usage"."action" in ('design_md', 'vision', 'jev_tag', 'jev_search', 'jev_directory', 'explain', 'revise', 'design_why', 'polish', 'auto_tag', 'query_en', 'embed'));