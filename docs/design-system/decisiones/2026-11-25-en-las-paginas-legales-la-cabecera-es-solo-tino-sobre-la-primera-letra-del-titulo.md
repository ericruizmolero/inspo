---
title: En las páginas legales la cabecera es solo Tino, centrado sobre la primera letra del título
date: 2026-11-25
status: vigente
kind: diseño
---

**Contexto.** Términos, privacidad y privacidad de la extensión (`marketing-site/src/components/LegalPage.astro`) llevaban la cabecera común de la web (`SiteHeader.astro`): Tino con la palabra «criterio», pegados al borde izquierdo de la pantalla, lejos de la columna de texto.

**Decisión.** `SiteHeader.astro` acepta `column`. Con él no pinta la palabra, la cabecera (`.hh-nav--column`) toma la misma columna que `.doc` (728 px, centrada) y Tino (32 px) se coloca con su centro sobre la primera letra del `h1`: `left: calc(24px + clamp(40px, 5.4vw, 66px) * 0.26 - 16px)`, media letra del tamaño del título. `LegalPage.astro` la usa; el resto de páginas sigue igual.

**Por qué.** Eric, 25-11, sobre `/terms/`: "en estas el bunny solo sin "criterio" y alineado centro con la T de terms".

**Cómo aplicarlo.** Si cambia el ancho de `.doc` o el `clamp` del `h1` en `LegalPage.astro`, se cambia también en `.hh-nav--column`. Se comprueba midiendo que el centro del svg coincide con el centro de la primera letra a 1440 y 390 px.
