-- Everything stored moves to English (2026-09-23).
-- Columns are renamed in place, never rebuilt: inspo_comment references inspo_item with
-- ON DELETE CASCADE, and a DROP inside the migrator's transaction could take the comments with it.
-- Side effect: the DDL default of `type` keeps the old text 'Inspiración'. Every insert sets the type.
ALTER TABLE `inspo_item` RENAME COLUMN `empresa` TO `name`;
--> statement-breakpoint
ALTER TABLE `inspo_item` RENAME COLUMN `fecha` TO `date`;
--> statement-breakpoint
ALTER TABLE `inspo_item` RENAME COLUMN `tipo` TO `type`;
--> statement-breakpoint
ALTER TABLE `inspo_item` RENAME COLUMN `autor` TO `author`;
--> statement-breakpoint
ALTER TABLE `inspo_item` RENAME COLUMN `comentarios` TO `note`;
--> statement-breakpoint
ALTER TABLE `inspo_item` RENAME COLUMN `subcomentarios` TO `sub_note`;
--> statement-breakpoint
-- The author inherited from the sheet ("we don't know who")
UPDATE `inspo_item` SET `author` = 'Both' WHERE `author` = 'Ambos';
--> statement-breakpoint
-- Taxonomy values inside tags_json: sector and style
UPDATE `inspo_item` SET `tags_json` = json_set(`tags_json`, '$.sector', CASE json_extract(`tags_json`, '$.sector')
  WHEN 'estudio' THEN 'studio' WHEN 'producto' THEN 'product' WHEN 'cultura' THEN 'culture' WHEN 'otro' THEN 'other'
  ELSE json_extract(`tags_json`, '$.sector') END)
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.sector') = 'text';
--> statement-breakpoint
UPDATE `inspo_item` SET `tags_json` = json_set(`tags_json`, '$.style', CASE json_extract(`tags_json`, '$.style')
  WHEN 'brutalista' THEN 'brutalist' WHEN 'corporativo' THEN 'corporate' WHEN 'inmersivo' THEN 'immersive'
  ELSE json_extract(`tags_json`, '$.style') END)
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.style') = 'text';
--> statement-breakpoint
-- Taxonomy keys inside tags_json.tags (probability per tag), one statement per key so a missing key stays missing
UPDATE `inspo_item` SET `tags_json` = json_remove(json_set(`tags_json`, '$.tags.typography', json_extract(`tags_json`, '$.tags.tipografia')), '$.tags.tipografia')
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.tags.tipografia') IS NOT NULL;
--> statement-breakpoint
UPDATE `inspo_item` SET `tags_json` = json_remove(json_set(`tags_json`, '$.tags.photography', json_extract(`tags_json`, '$.tags.fotografia')), '$.tags.fotografia')
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.tags.fotografia') IS NOT NULL;
--> statement-breakpoint
UPDATE `inspo_item` SET `tags_json` = json_remove(json_set(`tags_json`, '$.tags.illustration', json_extract(`tags_json`, '$.tags.ilustracion')), '$.tags.ilustracion')
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.tags.ilustracion') IS NOT NULL;
--> statement-breakpoint
UPDATE `inspo_item` SET `tags_json` = json_remove(json_set(`tags_json`, '$.tags.colorful', json_extract(`tags_json`, '$.tags.colorido')), '$.tags.colorido')
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.tags.colorido') IS NOT NULL;
--> statement-breakpoint
UPDATE `inspo_item` SET `tags_json` = json_remove(json_set(`tags_json`, '$.tags.monochrome', json_extract(`tags_json`, '$.tags.monocromo')), '$.tags.monocromo')
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.tags.monocromo') IS NOT NULL;
--> statement-breakpoint
-- DESIGN.md revisions: section and kind
UPDATE `design_revision` SET `section` = CASE `section`
  WHEN 'tipografia' THEN 'typography' WHEN 'espaciado' THEN 'spacing' WHEN 'componentes' THEN 'components'
  WHEN 'reglas' THEN 'rules' WHEN 'sistema' THEN 'system' WHEN 'afines' THEN 'related'
  ELSE `section` END
WHERE `section` IS NOT NULL;
--> statement-breakpoint
UPDATE `design_revision` SET `kind` = 'regeneration' WHERE `kind` = 'regeneracion';
--> statement-breakpoint
-- Activity areas
UPDATE `activity_segment` SET `area` = CASE `area`
  WHEN 'biblioteca' THEN 'library' WHEN 'busqueda' THEN 'search' WHEN 'comentarios' THEN 'comments'
  WHEN 'recursos' THEN 'directory' WHEN 'anadir' THEN 'add' WHEN 'equipo' THEN 'team'
  WHEN 'planes' THEN 'plans' WHEN 'ajustes' THEN 'settings' WHEN 'invitacion' THEN 'invitation'
  ELSE `area` END;
--> statement-breakpoint
-- AI usage action
UPDATE `ai_usage` SET `action` = 'jev_directory' WHERE `action` = 'jev_recursos';
--> statement-breakpoint
-- Plan key in the workspace metadata
UPDATE `organization` SET `metadata` = json_set(`metadata`, '$.plan', 'agency')
WHERE `metadata` IS NOT NULL AND json_valid(`metadata`) AND json_extract(`metadata`, '$.plan') = 'agencia';
