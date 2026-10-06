---
title: Vuelve la pestaña Presentación de Alberto y Resultados sale de la interfaz
date: 2026-10-06
status: vigente
kind: producto
supersedes: La pestaña Presentación pasa a ser Resultados (05-10), Resultados es un bento (05-10) y En Resultados la imagen va dentro de lo que se escribe (05-10)
---
**Contexto.** El 05-10 la pestaña Presentación (la guía de marca visual de Alberto) se sustituyó por Resultados, que en un solo día pasó de página de bloques con Tiptap a bento de celdas. Eric no llegó a verlo claro en ninguna de sus formas ("qué es el resultado, ¿esa línea? ¿ese párrafo?", "lo veo un poco raro", "pero no sé").

**Decisión.** La pestaña vuelve a ser **Presentación** tal como estaba en `main` (`components/brand/BrandPresentation.tsx`, pestañas Markdown, Documento y Presentación en `components/SystemView.tsx`, botón "Rellenar" y hoja `.spage-sheet`). Se retira todo lo de resultados: `components/ResultsView.tsx` y su CSS, las dependencias de Tiptap, las imágenes dentro de un texto, la miniatura de un texto por su primera imagen, la columna `project_item.result_at` con su migración 0021, `markResults` en `lib/projects.ts`, la acción `result` del agente, la sección "Resultados" de `criterio.md` y la herramienta `add_result` del conector MCP (`lib/mcp`), con su paso en los prompts y en `check:mcp`.

**Por qué.** Eric, 06-10: "lo de resultado vamos a revertirlo, vamos a poner el Presentación como tenía Alberto ayer". Y sobre dejar la capa de datos para el conector MCP: "sí, sobra de momento". Interpretación nuestra: la decisión de qué es un resultado y cómo se presenta sigue abierta entre Eric y Alberto.

**Cómo aplicarlo.** No construir otra vista de resultados sin que Eric y Alberto la hayan acordado. Si se vuelve a abrir, empieza por acordar la forma con Alberto; el código de ayer está en el historial de esta rama.
