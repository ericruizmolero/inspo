CREATE TABLE `design_why` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`url` text NOT NULL,
	`stamp` text NOT NULL,
	`model` text NOT NULL,
	`why_json` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `design_why_org_url_idx` ON `design_why` (`organization_id`,`url`);