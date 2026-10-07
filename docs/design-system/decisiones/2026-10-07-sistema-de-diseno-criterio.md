---
title: El producto pasa al sistema de diseño Criterio
date: 2026-10-07
status: vigente
kind: diseño
supersedes: una sola fuente Inter (2026-09-23), superficies de cristal (2026-10-02), los "botones sin borde" de sin mono, menos bordes (2026-10-03)
---
**Contexto.** Alberto hizo el sistema de diseño de Criterio como artefacto (claude.ai/artifact/RM3rCVaxFN4rg8E6XofybK): marca, tokens, componentes y una criatura de tres ojos como personaje. La app seguía con Inter, neutros cálidos, barras de cristal y botones sin borde.

**Decisión.** Toda la plataforma (la app web y la extensión de Chrome) usa los tokens y los componentes del sistema:
- Tipos: Archivo para todo (`--font-sans`, `--font`) y Bricolage Grotesque 700/800 para titulares (`--font-display`, `h1`, `h2`), en `app/fonts.ts`. Nunca display por debajo de 16 px ni en texto corrido.
- Color: `--paper`, `--ink`, `--board`, `--board-card` (el `card` del sistema; `--card` es de shadcn), `--moss`, `--ember`, `--butter` y los `--chrome-*`. Tema oscuro = Board, tema claro = Paper. Los nombres viejos (`--bg`, `--panel`, `--surface`, `--text`…) apuntan a los del sistema en `app/globals.css`.
- El botón primario es ember (`Button` primary, `.cr-btn-primary`, `.btn--primary`), uno por vista.
- Controles con el guiño a 2000: borde de tinta `--stroke-control`, `--bevel`, `--bevel-pressed`; campos y casillas `--sunken` sobre `--field`. Tarjetas planas, sin sombra; solo flota la barra de comandos (`--float`).
- El cromo del producto (pestañas, selector de vista, zoom, barra de comandos, visor) es sólido: sin cristal ni `backdrop-filter` en barras ni superficies. Los `--dock-*` apuntan al cromo.
- La disposición del sistema: TabBar arriba a la izquierda, ViewSwitcher (Tablero y Sistema) arriba a la derecha, CommandBar abajo, PromptInput y BoardCard en Inicio, Viewer para una referencia, ZoomControl abajo a la izquierda.
- Componentes en `components/criterio/` (`index.tsx` y `criterio.css`, clases `cr-*`), portados del bundle del sistema. Pulir sigue retirado del selector de vista.

**Por qué.** Alberto: "use its tokens and components for the whole product (except the maskot for now) and start using all of them across the platforms". Eligió adoptar también la disposición del sistema, no solo los colores, y aplicarlo a la app web y a la extensión.

**Cómo aplicarlo.** Antes de dibujar algo, busca su componente en `components/criterio/` o su clase `cr-*`. Valores solo de tokens del sistema. Un primario ember por vista. Los principios viejos de cristal, una sola fuente y botones sin borde ya no valen.

**Lo que se afinó el mismo día**, cada cosa en su decisión: [el cromo sigue al tema](2026-10-07-el-cromo-sigue-al-tema.md), [lo que era primario sigue siéndolo](2026-10-07-lo-que-era-primario-sigue-siendo-primario.md), [un solo botón de icono](2026-10-07-un-solo-boton-de-icono-redondo.md), [el selector de proyecto](2026-10-07-el-selector-de-proyecto-es-primario-cuando-la-referencia-tiene-proyecto.md), [cada icono con su trazo](2026-10-07-cada-icono-conserva-su-trazo.md), [la criatura como logotipo](2026-10-07-la-criatura-es-el-logotipo-y-nada-mas.md), [las ventanas de aviso con barra moss](2026-10-07-toda-ventana-lleva-barra-moss-y-sigue-al-tema.md), [los campos en Board](2026-10-07-los-campos-tienen-version-oscura.md), [la pasada de coherencia](2026-10-07-las-piezas-pequenas-copian-a-las-grandes.md) y [la tipografía en un solo sitio](2026-10-07-la-tipografia-vive-en-un-solo-sitio.md). Después, [el cromo de arriba vuelve a 44](2026-10-07-el-cromo-de-arriba-vuelve-a-44-y-sus-pastillas-a-cristal.md).
