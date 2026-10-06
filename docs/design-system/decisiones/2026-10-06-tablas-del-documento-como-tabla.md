---
title: En el Documento una tabla de Markdown se lee como tabla, sin barras ni caja
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** En el aspecto Documento de criterio.md, una tabla (la escala tipográfica, por ejemplo) salía como texto crudo: las barras `|`, la fila `|---|---|` y las columnas sin alinear. Eric, 06-10, con una captura de la escala tipográfica: "esto también se tiene que ver bien".

**Decisión.** `components/SystemMarkdown.tsx` reconoce las filas de una tabla (`tableRow`: una cabecera, su regla y las filas que siguen) y envuelve cada celda en `.mdv-td` con su ancho en `--w`, que sale de la celda más larga de cada columna, así todas las filas cortan en el mismo sitio. Las barras pasan a ser marcas (`.mdv-mark`), ocultas en el Documento como el resto. En `components/SystemDoc.css`: celdas en `inline-block`, cabecera pequeña en `--muted`, primera columna en `--text` con peso 500, cifras tabulares, una línea `--border` entre filas (`--border-strong` bajo la cabecera) y ninguna caja ni línea vertical. La fila de regla no ocupa sitio pero sigue en el texto. El aspecto Markdown no cambia, salvo que las barras se ven apagadas.

**Por qué.** La cita de Eric. La forma es propuesta mía, pendiente de que la vea. Las celdas son `inline-block` y no una tabla ni una rejilla de CSS porque el texto se escribe en el sitio y se lee de vuelta con `innerText`: una tabla le mete tabuladores y una rejilla, saltos de línea. Comprobado en maqueta que el texto vuelve idéntico.

**Cómo aplicarlo.** Todo lo que Markdown sabe decir tiene su forma en el Documento; si algo sale crudo, falta dibujarlo. Una tabla lleva líneas entre filas y nada más. Lo que se dibuje sobre texto editable no puede cambiar lo que `innerText` devuelve.
