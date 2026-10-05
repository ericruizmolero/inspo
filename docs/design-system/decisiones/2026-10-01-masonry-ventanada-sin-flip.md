---
title: Tablero ventanado y recolocación sin GSAP Flip
date: 2026-10-01
status: vigente
kind: desarrollo
---
**Contexto.** Con 286 referencias el tablero iba a tirones: todas las tarjetas montadas y `Flip.from` forzando un layout por tarjeta (1,5 s).

**Decisión.** Solo se montan las tarjetas a ±1 pantalla del viewport (las 48 primeras en SSR). La recolocación usa el patrón de la cortina: leer todo, `flushSync`, leer todo, `el.animate()`.

**Por qué.** De 18-27 frames por 1,2 s a 66-69.

**Cómo aplicarlo.** Listas largas siempre ventanadas. Ojo: una tarjeta que sale del viewport se desmonta y pierde su estado.

**Estado (2026-10-05).** El ventanado sigue (`Grid.tsx`). La recolocación ya no usa WAAPI: desde el `Grid` del 03-10 el layout son números (ratio de cada tarjeta, nada se mide para colocarla) y una tarjeta que cambia de sitio se desliza con una transición CSS de `transform`, que se redirige si llega otro cambio a mitad.
