---
title: Tino en píxeles, en blanco y negro, en todas partes
date: 2026-11-06
status: vigente
kind: diseño
supersedes: el dibujo de "El favicon es Tino, el mismo de la landing" (2026-11-03)
---
**Contexto.** El favicon, el logo de la app, los iconos de la extensión y la marca de la landing eran Tino liso (orejas con contorno redondeado, visor de trazo redondo). Eric trajo una referencia de Tino pixelado en lila y pidió probarlo "como favicon" y "como logo", "en blanco y negro". Primero se probaron dos versiones nuestras (rejilla de 24 reducida y rejilla nativa de 16); Eric pidió "trazar mejor las formas, más marcadas respetando el píxel" y al final dibujó él la suya (`icon (1).svg`, hecha con Arrow).

**Decisión.** Tino es el dibujo de Eric: 22 × 20 píxeles ajustados a su rejilla, centrados en un lienzo de 24 × 24, con el visor como hueco. En tinta `#1B1B18`, y en papel `#EDE6D6` o blanco sobre oscuro. Va en: `app/icon.svg` (cambia solo con `prefers-color-scheme`), `app/favicon.ico` (16 a 64), `app/icon.png` (256), `app/apple-icon.png` (180) y `public/app-icon-512.png` sobre papel; `TinoMark`/`Logo` en la app, cada uno con el tamaño que ya tenía su sitio; los iconos de la extensión (`extension/chrome/icons/`: baldosa `icon16` a `icon128`, `tino-white-*`, `tino-ink-*`, `tino.svg`); y la web de marketing: la marca de cabecera y pie de `/es/` (con las orejas aún animadas al pasar el ratón y el visor que se enciende), su favicon `assets/marca/conejo-icono.svg` y `apple-touch-icon.png`, y en la web en inglés `favicon.ico`, `icon.svg`, `icon-512.png` y `logo.png`, que aún eran la criatura verde.

**Por qué.** Eric: "este si lo escalas a dimensión favicon funciona", "pon esta variante de favicon icono logo (blanco y negro) en todo, respetando los tamaños en cada sitio". Que el píxel lea mejor a 16 px que el dibujo liso es interpretación nuestra.

**Cómo aplicarlo.** Un icono o logo nuevo de Criterio sale de este trazado (el de `components/TinoMark.tsx`), nunca de una reducción del dibujo liso. El peluche 3D y su dibujo plano de descarga (`public/tino/tino-plano.svg`) no cambian.
