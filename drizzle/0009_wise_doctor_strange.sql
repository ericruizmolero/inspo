ALTER TABLE `user` ADD `language` text DEFAULT 'en' NOT NULL;
--> statement-breakpoint
-- Las cuentas que ya existen se quedan en castellano: el idioma por defecto solo
-- vale para las que se creen a partir de ahora.
UPDATE `user` SET `language` = 'es';
