---
title: Post-its en la página y ficha DESIGN.md retirados
date: 2026-10-05
status: retirada
kind: producto
---
**Decisión.** Fuera las notas fijadas sobre la página de una referencia (comentarios solo en la conversación) y la generación de DESIGN.md al subir una referencia (el panel queda en página + conversación).

**Por qué.** El sistema solo recibía "fijado al X % de la página" como texto, dos sitios para comentar confundían y no encajaba en imagen, vídeo, post ni texto. La ficha DESIGN.md quedó por detrás de criterio.md.

**Cómo aplicarlo.** No reintroducir anotaciones posicionales sobre referencias. Pendiente: marcar un comentario con un área para que su porqué llegue a criterio.md.

**10-10.** Las columnas `anchor_x`, `anchor_y` y `anchor_h` de `inspo_comment` se borraron (migración `0028`), y con ellas las rutas `/api/design-md/why` y `/api/design-md/revisions` y `lib/design-probe.ts`, que nadie llamaba. Lo guardado en `design_why` y `design_revision` se sigue leyendo.
