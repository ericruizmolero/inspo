ALTER TABLE `ai_usage` ADD `cost_source` text DEFAULT 'estimated' NOT NULL;--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `provider` text;--> statement-breakpoint
ALTER TABLE `ai_usage` ADD `request_id` text;