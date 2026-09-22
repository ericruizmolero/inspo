CREATE TABLE `feedback_note` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text,
	`path` text NOT NULL,
	`url` text NOT NULL,
	`viewport` text,
	`data` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`sent_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `feedback_note_pending_idx` ON `feedback_note` (`sent_at`,`updated_at`);--> statement-breakpoint
CREATE INDEX `feedback_note_user_path_idx` ON `feedback_note` (`user_id`,`path`);