---
title: El cromo sigue al tema, oscuro en Board y claro en Paper
date: 2026-10-07
status: vigente
kind: diseño
supersedes: el cromo "oscuro siempre" del sistema Criterio (2026-10-07) y el "cromo que no cambia" de tema claro y oscuro (2026-09-21)
---
**Contexto.** El sistema Criterio quería el cromo del producto (pestañas, selector de vista, zoom, barra de comandos, visor) oscuro en los dos temas. Al aplicarlo, las barras salían negras sobre el papel del tema claro.

**Decisión.** Los `--chrome*` cambian de valor en `:root[data-theme="light"]` (`app/globals.css`): en Board son `#161616`, `#1C1C1C`, `#2A2A2A`; en Paper son `--paper-light`, `--paper-light` y `--disabled`. `--chrome-ink` es el texto fuerte sobre el cromo (papel en Board, tinta en Paper) y `--chrome-border` su línea. Las piezas que van sobre cromo (`.cr-on-chrome`, la Isla, `.topbar__switch`, `.zoom-pill`, `.dock__bar`, `.ip`, `.island-pop`) leen esos tokens, no colores fijos.

**Por qué.** Alberto, al ver las barras negras sobre papel: "actually all of this" (pidió que no fueran negras en el tema claro). Esto se aparta del sistema, que lo quería oscuro siempre.

**Cómo aplicarlo.** Nada en el cromo lleva un color fijo: `--chrome*` y `--chrome-ink`. Si una pieza nueva va sobre el cromo, añádele `cr-on-chrome` para que sus botones de icono tomen los tokens del cromo. Sin cristal en barras ni superficies; las pastillas de hover y activa de la Isla y del selector son la única excepción. → [cromo de arriba](2026-10-07-el-cromo-de-arriba-vuelve-a-44-y-sus-pastillas-a-cristal.md)
