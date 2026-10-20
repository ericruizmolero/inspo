---
title: En la casa se dice proyecto, aunque el diseño dijera tablero
date: 2026-10-20
status: vigente
kind: producto
---
**Contexto.** El diseño de la casa nueva ("What are you making today?", captura "Home with Tino") llamaba "boards" a los proyectos: "Your boards", "5 boards", "New board". En la app, la palabra para lo que el equipo crea y llena es proyecto; el tablón es solo una de sus vistas (Tablón, Pulido, Sistema).

**Decisión.** La casa (`components/ProjectChooser.tsx`, cadenas en `chooser` de `lib/i18n/en/ui.ts` y `lib/i18n/es/ui.ts`) dice proyecto en todo el texto: "Your projects" / "Tus proyectos", la cuenta "5 projects, 44 references" / "5 proyectos, 44 referencias" y la última tarjeta "New project" / "Proyecto nuevo". El componente sigue llamándose `BoardCard` y su portada sigue siendo el tablón en pequeño: eso es dibujo, no texto.

**Por qué.** Lo decidió Alberto al encargar la casa: la palabra de la app es proyecto, nunca tablero en el texto. Interpretación nuestra: dos nombres para lo mismo obligan a preguntarse si son dos cosas, y el resto de la app (la Isla, el menú de proyecto, criterio.md) ya dice proyecto.

**Cómo aplicarlo.** Cuando un diseño llegue con "board" o "tablero" para lo que la app llama proyecto, el texto se cambia a proyecto sin preguntar. "Tablón" queda solo para la vista del tablón de un proyecto.
