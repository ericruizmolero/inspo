CREATE TABLE `app_admin` (
	`email` text PRIMARY KEY NOT NULL,
	`added_by` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL
);
