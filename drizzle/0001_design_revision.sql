CREATE TABLE `design_revision` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`url` text NOT NULL,
	`author_id` text,
	`author_name` text NOT NULL,
	`kind` text DEFAULT 'revision' NOT NULL,
	`section` text,
	`comment` text DEFAULT '' NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`warning` text,
	`spec_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `design_revision_org_url_idx` ON `design_revision` (`organization_id`,`url`);