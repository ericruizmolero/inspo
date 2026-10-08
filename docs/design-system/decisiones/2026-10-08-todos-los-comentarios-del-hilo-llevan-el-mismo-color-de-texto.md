---
title: Todos los comentarios del hilo llevan el mismo color de texto, sea de quien sea
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** En la conversación de una referencia (`CommentsPanel`, `.cm-msg`) el texto de los comentarios iba en `--text-2`, y solo el comentario original y los tuyos subían a `--text`. Venía del primer diseño ("las palabras en papel apagado"). Con dos personas en el hilo, el comentario del otro se veía más tenue que el tuyo. Eric, 08-10, con una captura de un hilo con Alberto: "el texto del segundo comentario está más opaco no?".

**Decisión.** `.cm-msg__body` va en `--text` para todos los comentarios (`app/globals.css`); se quitan las reglas `.cm-msg.is-original .cm-msg__body` y `.cm-msg.is-mine .cm-msg__body`, que ya no hacen falta. El papel apagado (`--chrome-text-muted`, `--text-muted`) queda solo en el `Comment` del sistema, el avance de dos líneas bajo una tarjeta del tablón, que es un resumen y no la conversación.

**Por qué.** Lo señaló Eric con la frase de arriba. Interpretación nuestra: en un hilo, quién lo escribió ya lo dice el nombre y el avatar; un color distinto por autor se lee como jerarquía (tu palabra vale más) o como estado (el otro comentario está pendiente), y ninguna de las dos cosas es verdad.

**Cómo aplicarlo.** El color del texto no distingue autores ni al original del resto: la autoría va en el nombre, el avatar y el chip "tú". El texto apagado se reserva para lo que es resumen o ayuda, no para lo que alguien escribió en la conversación.
