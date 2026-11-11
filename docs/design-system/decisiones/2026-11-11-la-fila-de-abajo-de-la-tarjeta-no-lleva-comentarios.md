---
title: La fila de abajo de la tarjeta no lleva botón de comentarios, solo archivar
date: 2026-11-11
status: vigente
kind: diseño
---
**Contexto.** Sobre la imagen de una tarjeta del tablón, al pasar el ratón, la fila de abajo a la izquierda (`.tile__go`, `components/InspoCard.tsx`) llevaba la carpeta, la brújula de las áreas cuando la vista la ofrece y un `IconButton` de comentarios ([las dos filas llevan los mismos botones s](2026-10-07-las-dos-filas-de-la-tarjeta-llevan-los-mismos-botones-s-y-la-carpeta-archivada-es-ember.md)). El hilo ya se abre al pulsar la tarjeta (la ficha lo lleva) y desde la nota de debajo (`.tile__note`).

**Decisión.** Se quita el `IconButton` de comentarios de `.tile__go`. La fila queda con la carpeta (`ProjectPicker`) y, donde exista, la brújula (`AreaPicker`), con la misma pieza de antes: `IconButton` strong s en cuadrado redondeado, ember con `.is-filed`. La fila solo se pinta si hay algo que archivar (`onToggleProject` u `onToggleArea`), así que una tarjeta que solo admite comentarios (el enlace compartido) no deja una fila vacía. El pie táctil (`.tile__caption`) conserva su botón de comentarios con el número, porque ahí no hay hover.

**Por qué.** Eric, 11-11, con la captura de la fila: "de ahí quita lo de comentarios porque ya si abres la ficha lo tiene, deja solo el tema de carpeta". Interpretación nuestra: mantener el botón en el pie táctil, que Eric no señaló.

**Cómo aplicarlo.** Sobre la imagen de una tarjeta solo van acciones que no tienen otro camino a un clic. Lo que ya abre la ficha o la nota de debajo no se repite como botón flotante.
