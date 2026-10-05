---
title: Un área solo se rellena con lo que el equipo trajo; Mejorar con IA puede ir más allá
date: 2026-10-05
status: vigente
kind: producto
---
**Contexto.** Al añadir referencias, la pasada automática del modelo (`runSystem` en `lib/system.ts`, lanzada por `refreshSystem` en `components/InspoClient.tsx`) decidía las 8 áreas con solo dos webs, a partir de lo que mide de cada página.

**Decisión.** En la pasada automática un área solo se decide si las palabras del equipo hablan de ella, si se archivó en ella una referencia o si la referencia es material de esa área (una tipografía, una paleta, un logo, una animación, un set de iconos, una foto, un texto pegado). Una web guardada sin palabras no decide ningún área por sí sola. Solo la pasada pedida desde "Mejorar con IA" (`focusForModel`) puede rellenar áreas con todo el contexto, con confianza baja (25 a 45).

**Por qué.** Eric: "si añades 2 ya hay 8/8 de campos rellenos y eso no es verdad. tiene que ser fiel a lo que el usuario suba" y "luego ya en mejorar con IA si que se puede rellenar todo con el contexto".

**Cómo aplicarlo.** El contador de áreas (x/8) tiene que poder leerse como lo que el equipo ha dicho. Lo que la IA deduce sin que nadie lo pida no cuenta como decidido; si se quiere, se pide con Mejorar con IA.
