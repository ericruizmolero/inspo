CREATE TABLE `activity_segment` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`visit_id` text NOT NULL,
	`area` text NOT NULL,
	`path` text NOT NULL,
	`device` text,
	`started_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`seconds` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `activity_segment_user_seen_idx` ON `activity_segment` (`user_id`,`last_seen_at`);--> statement-breakpoint
CREATE INDEX `activity_segment_seen_idx` ON `activity_segment` (`last_seen_at`);