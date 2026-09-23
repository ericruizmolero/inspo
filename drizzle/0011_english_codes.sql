-- Stored codes move to English (2026-09-23). Column renames and the other codes: 0012.
UPDATE `inspo_item` SET `tipo` = CASE `tipo`
  WHEN 'Inspiración' THEN 'inspiration'
  WHEN 'Videos' THEN 'videos'
  WHEN 'Ideas' THEN 'ideas'
  WHEN 'Documentales' THEN 'documentaries'
  ELSE `tipo` END;
--> statement-breakpoint
-- AI tags: estilo → style, estiloP → styleP, resumen → summary. The taxonomy values follow in 0012.
UPDATE `inspo_item` SET `tags_json` = json_remove(
  json_set(`tags_json`,
    '$.style', json_extract(`tags_json`, '$.estilo'),
    '$.styleP', json_extract(`tags_json`, '$.estiloP'),
    '$.summary', json_extract(`tags_json`, '$.resumen')),
  '$.estilo', '$.estiloP', '$.resumen')
WHERE `tags_json` IS NOT NULL AND json_valid(`tags_json`) AND json_type(`tags_json`, '$.estilo') IS NOT NULL;
