---
title: El icono de app es Tino en blanco sobre el negro de la app
date: 2026-11-24
status: vigente
kind: diseño
---
**Contexto.** Desde [Tino en píxeles](2026-11-06-tino-en-pixeles-en-todas-partes.md), el icono que se ve al añadir Criterio a la pantalla de inicio (`app/apple-icon.png` y `public/app-icon-512.png`, el del manifiesto) era Tino en tinta sobre papel. Eric: "la imagen de app la tenemos que hacer mas guay... fondo negro y tino en blanco... el negro que sea el mismo color de background que la app".

**Decisión.** `app/apple-icon.png` (180) y `public/app-icon-512.png` (512) son Tino en blanco `#FFFFFF` sobre `#161614`, el `--board` de `app/globals.css` y el mismo `background_color`/`theme_color` de `app/manifest.ts`. El visor va recortado, deja ver el fondo. Dibujo de `components/TinoMark.tsx` (el de `public/tino/tino-logo-blanco.svg`) en un lienzo de 32 celdas: el 24 de siempre con 4 de margen alrededor. El favicon, `TinoMark`/`Logo` y los iconos de la extensión no cambian.

**Por qué.** Lo pidió Eric con esas palabras. Que el fondo coincida con el del manifiesto hace que la pantalla de arranque y el icono sean del mismo negro (interpretación mía de "el mismo color de background que la app").

**Cómo aplicarlo.** Si cambia el dibujo de Tino o el `--board`, los dos PNG se vuelven a sacar con sharp desde el SVG blanco, con `shape-rendering="crispEdges"` y el fondo pintado (sin transparencia: iOS pinta de negro lo transparente). Un icono de app nuevo sigue esta misma pareja de colores.
