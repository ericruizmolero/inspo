---
title: Una reacción por persona y la línea de las respuestas sube hasta la foto
date: 2026-10-12
status: vigente
kind: diseño
---

**Contexto.** Los comentarios y las respuestas de la conversación (`CommentsPanel`) ganaron reacciones con emoji, como en Slack o WhatsApp. En la primera versión cada persona podía poner tantos emoji como quisiera, la pastilla llevaba una línea `--border` y el botón Responder iba en talla s con el foco por fuera.

**Decisión.** Cada persona deja una sola reacción por comentario: elegir otro emoji sustituye el suyo y elegir el mismo lo quita (`toggleReaction` en `lib/comments.ts`, `toggleIn` en `lib/reactions.ts`, y el suyo marcado en el menú con `.cm-picker__emoji.is-mine`). La pastilla (`.cm-react`) pasa a 26 px, fondo `--surface-2` sin línea, emoji a 15 px y número pequeño en semibold; la tuya teñida de ember con un anillo fino ember, y entra con `react-in`. Un comentario con respuestas (`.cm-thread.has-replies`) lleva la línea desde debajo de la foto de su autor hasta las respuestas. Responder (`.cm-reply-btn`) baja a 26 px y tamaño label, con el foco por dentro (`outline-offset: -2px`).

**Por qué.** Eric, 12-10: "que no puedas poner tantos emojis como quieras por comentario solo 1", "el tag del emoji mejora de diseño", "que la respuesta a un comentario la linea persiga hasta la foto de arriba" y, del botón, "el border de responder ahi se toca con todo lo demás, hazlo más pequeño el butto y cuidado". La forma concreta de la pastilla es interpretación nuestra de "mejora de diseño".

La nota con la que se guardó una referencia también admite reacciones, con la misma regla de una por persona (`toggleNoteReaction`, `inspo_item.note_reactions`): Eric, 12-10, "yo no puedo reaccionar a primeros comentarios de andoni en la ficha desde pulido, eso arreglar".

Eric, 12-10, preguntó si las reacciones avisan, "al menos a la campanita": avisan en la campanita solo a quien escribió lo reaccionado, como en Slack, y nunca por correo ni en el resumen diario (`reactionsTo` en `lib/notify.ts`). Que no lleguen al resto del equipo es interpretación nuestra, para no llenar la campanita de todos con cada emoji.

**Cómo aplicarlo.** Una reacción nueva en otra parte de la app sigue la misma regla de una por persona. Los botones de texto dentro de un hilo no pasan de 26 px y su foco no sale del botón cuando tienen vecinos a menos de 8 px.
