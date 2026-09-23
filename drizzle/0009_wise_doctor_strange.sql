ALTER TABLE `user` ADD `language` text DEFAULT 'en' NOT NULL;
--> statement-breakpoint
-- Existing accounts stay in Spanish: the default language only applies
-- to accounts created from now on.
UPDATE `user` SET `language` = 'es';
