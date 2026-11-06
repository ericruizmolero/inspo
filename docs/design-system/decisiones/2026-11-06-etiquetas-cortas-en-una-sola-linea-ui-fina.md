---
title: Las etiquetas y opciones cortas van en una sola línea, y el detalle al tooltip
date: 2026-11-06
status: sustituida
kind: diseño
---
**Contexto.** Para que Añadir dijera qué se puede pegar, se pusieron bajo el enlace cuatro fichas (Webs, Vídeos, Posts, Tableros) con icono de 18, nombre y debajo de dónde viene cada una ("YouTube, Vimeo, Loom", "Pinterest, Are.na, Cosmos"). A 590 px de modal esos subtítulos partían en dos y tres filas, y las fichas ocupaban casi tanto como el campo. El recuadro de texto ("O escribe o pega un texto: servicios, copy, lo que diga el proyecto") también partía en dos.

**Decisión.** Las fichas pasan a una sola línea fina, `.add__kinds` en `app/globals.css`: icono Phosphor de 14 y nombre a `--fs-label` en `--add-quiet`, sin caja ni fondo, 16 px entre ellas; de dónde viene cada tipo va en el `title` (tooltip). Los nombres son "Webs", "Vídeos", "Posts de X" y "Tableros" (`add.kinds` en `lib/i18n/{en,es}/ui.ts`). Al pegar, la que corresponde sube a `--text` y las demás bajan al 40 %. `add.pickText` se acorta a "O escribe o pega un texto".

**Por qué.** Eric, 06-11: "cuidado con los textos en 2 filas, quedan mal. haz la UI fina". Interpretación nuestra: una opción o una etiqueta corta que parte en dos filas parece un párrafo, y la fila deja de leerse de un golpe.

**Cómo aplicarlo.** Etiquetas, opciones, pastillas y textos de recuadros caben en una línea a la anchura donde viven. Si no caben, primero se acorta el texto; el detalle que sobre va al tooltip o desaparece. Ante la duda, más fino: icono pequeño y texto a `--fs-label` antes que tarjetas con subtítulo.

**Matiz** del 2026-11-06: la línea fina se quedó pequeña y la sustituyen seis filas como las de la extensión; la regla de una sola línea sigue. → [decisión](2026-11-06-anadir-ensena-las-seis-entradas-como-la-extension.md)
