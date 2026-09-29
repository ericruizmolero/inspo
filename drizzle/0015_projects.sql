CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`created_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_org_idx` ON `project` (`organization_id`);--> statement-breakpoint
CREATE TABLE `project_item` (
	`project_id` text NOT NULL,
	`item_id` text NOT NULL,
	`organization_id` text NOT NULL,
	`added_by` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`project_id`, `item_id`),
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`item_id`) REFERENCES `inspo_item`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `project_item_org_idx` ON `project_item` (`organization_id`);--> statement-breakpoint
CREATE INDEX `project_item_item_idx` ON `project_item` (`item_id`);