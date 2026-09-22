CREATE TABLE `ext_key` (
	`id` text PRIMARY KEY NOT NULL,
	`hash` text NOT NULL,
	`prefix` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`user_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ext_key_hash_idx` ON `ext_key` (`hash`);--> statement-breakpoint
CREATE INDEX `ext_key_org_idx` ON `ext_key` (`organization_id`);--> statement-breakpoint
CREATE INDEX `ext_key_user_idx` ON `ext_key` (`user_id`);