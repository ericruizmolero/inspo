---
title: El tablón se funde con su fondo bajo las barras
date: 2026-10-09
status: vigente
kind: diseño
---

**Contexto.** El dock (buscador y cabecera del proyecto) y la pastilla de la esquina flotan sobre el masonry, y las tarjetas pasaban enteras por debajo, cortadas a secas por el borde de la ventana. Arriba, al hacer scroll, pasaba lo mismo bajo la Isla. El sistema ya tenía la nubecita de las listas con scroll (`.cr-scroll-fade`, 28 px dentro de un menú), pero el tablón no la tenía.

**Decisión.** Dos nubecitas del color del fondo, `.board-fade` (`components/Grid.tsx`, estilos en `app/globals.css`), hermanas del scroller `.board` y fuera de él: un degradado de `--bg` a transparente en cuatro paradas (100, 82, 36 y 0 por ciento del fondo) para que no se vea el filo. La de abajo (`.board-fade--bottom`) está siempre y mide la banda que ocupan las barras (`--fade`, las márgenes que Grid recibe de InspoClient: 112 px con dock, 24 sin él, con un suelo de 72) más 32 px de cola. La de arriba (`.board-fade--top`) mide la banda de la Isla (64 px) más 40, y solo se ve cuando el tablón ha dejado el principio (`.is-on` a partir de 4 px de scroll, con un fundido de 220 ms). Sin z propio: pintan sobre el tablón por orden del DOM y bajo cualquier barra; `pointer-events: none`; no se montan mientras el tablón está debajo de Pulido (`under`), porque Pulido monta las suyas: las mismas dos clases en `components/PolishView.tsx` (64 y 112 px, con `z-index: 4` en `PolishView.css`, sobre el cielo de tarjetas y bajo la barra y la pastilla), y la de arriba siempre encendida, porque ahí las tarjetas giran bajo la Isla sin que haya scroll.

**Por qué.** Eric, 09-10, con una captura del dock sobre el masonry: "que tal si podemos nubecita del color de background en la parte baja?" y, acto seguido, "y en la parte arriba cuando haces scroll igual también eh" y "ese top bottom niebla tiene que estar en pulido también eh". Interpretación: la misma regla que en las listas, el borde fundido dice que hay más y las barras descansan sobre fondo tranquilo en vez de sobre un trozo de tarjeta.

**Cómo aplicarlo.** Donde una barra flote sobre contenido que hace scroll, el contenido se funde con el fondo de la vista bajo la barra, del color del fondo (`--bg`), nunca blanco ni negro fijos para que siga al tema. La nube de arriba solo cuando hay recorrido por encima. Si cambian las márgenes del tablón (`TOP_DESKTOP`, `BOTTOM`), las nubes siguen solas por `--fade`.
