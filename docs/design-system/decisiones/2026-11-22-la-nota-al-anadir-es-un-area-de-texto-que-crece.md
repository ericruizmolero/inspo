---
title: La nota al añadir una referencia es un área de texto que crece
date: 2026-11-22
status: vigente
kind: diseño
---
**Contexto.** En Añadir referencia, la nota ("¿Qué te ha llamado la atención?") era un `Input` de una línea. Una nota larga se cortaba y solo se veía su final, desplazado a la izquierda.

**Decisión.** La nota es el `TextArea` del sistema con `.add__note` (`components/AddInspoModal.tsx`, `app/globals.css`): empieza con la altura de un campo, 44 px, crece con lo escrito (`field-sizing: content`) hasta `min(200px, 30dvh)` y luego hace scroll, sin asa de redimensionar. Enter guarda la referencia y Shift+Enter salta de línea, como el compositor de comentarios. El foco es el mismo borde que sube a `--text` que el resto de campos de `.add`.

**Por qué.** Alberto, con una nota larga cortada en pantalla: "this should be a textbox". La nota acaba siendo el primer comentario de la tarjeta, así que se escribe igual que un comentario (interpretación nuestra para elegir las teclas).

**Cómo aplicarlo.** Un campo donde se escribe una frase libre o más (notas, comentarios) es un `TextArea` que crece, no un `Input`. Si vive en un formulario de un solo paso, Enter envía y Shift+Enter salta de línea.
