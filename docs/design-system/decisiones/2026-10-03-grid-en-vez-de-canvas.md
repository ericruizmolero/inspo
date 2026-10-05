---
title: Tablero masonry con scroll vertical en vez de lienzo infinito
date: 2026-10-03
status: vigente
kind: diseño
supersedes: Canvas infinito (PR #56)
---
**Contexto.** El canvas infinito (PR #56) abrumaba con 286 referencias.

**Decisión.** Masonry con scroll vertical (`Grid.tsx`); el zoom (100 % por defecto) mueve el número de columnas; masonry "más pegadita" (gap 10, padding 12).

**Por qué.** Se queda todo lo bueno del canvas (buscador por capas, isla, auto-tags) sin la sensación de perderse.

**Cómo aplicarlo.** Nada de lienzos infinitos para colecciones. `lib/canvas.ts` y `canvas_position` están pendientes de limpiar.
