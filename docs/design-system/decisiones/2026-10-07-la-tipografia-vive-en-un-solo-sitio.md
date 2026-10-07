---
title: La tipografía vive en un solo sitio y los controles miden 44
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Cada componente ponía su propio tamaño de título: el mismo `h2` medía distinto en Ajustes, en un diálogo y en el Sistema.

**Decisión.** Los elementos `h1` a `h6` llevan su paso en el bloque "Type: the one place" de `app/globals.css` y las clases `.t-*` cubren el resto (display, title-l, title-m, title-s, body, ui, small, label); el `h1` es 800. El CSS de un componente no pone tamaño, peso, interlineado, tracking ni familia: elige un paso. Los controles miden 44, como el `Button` m: campos, selects y el `SegmentedControl` de papel se alinean con el botón de al lado; barras de herramientas y menús usan la talla s (34).

**Por qué.** Alberto: "all the h1, h2, h3… should be the same size everywhere".

**Cómo aplicarlo.** Un título es su elemento; la clase `.t-*` solo si el aspecto debe ser otro que el nivel (el título de un diálogo es un `h2` con `.t-title-m`). Si un componente necesita otro tamaño, falta un paso en la escala, no una regla local.
