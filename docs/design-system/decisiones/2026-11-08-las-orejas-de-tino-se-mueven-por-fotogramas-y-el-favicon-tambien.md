---
title: Las orejas de Tino en píxeles se mueven por fotogramas, y el favicon también
date: 2026-11-08
status: vigente
kind: diseño
---
**Contexto.** Con el Tino en píxeles, el hover del logo seguía girando las orejas con `rotate`: al girar se despegaban de la cabeza y salían de la cuadrícula. El favicon era estático.

**Decisión.** En `public/es/index.html` y `public/index.html`, cada oreja del logo (cabecera y pie) tiene tres fotogramas (`.ear.px0`, `.px1`, `.px2`): reposo, estirada un píxel hacia arriba y encogida un píxel hacia la cabeza. El hover los alterna con `visibility` y `step-end` en 0,62 s, la derecha 0,08 s después. Sin `rotate`. `public/favicon-anim.js` (cargado en las dos landings y en `Base.astro`) hace lo mismo en la pestaña: cada 6 a 10 s cambia el favicon SVG por los fotogramas 1 y 2 y vuelve al reposo, sacados del mismo dibujo de `icon.svg`.

**Por qué.** Andoni: «ajusta el de pixel con una animación que las orejas no se corten al moverse» y «el favicon se debería mover estilo gif como cuando haces hover en el isotipo».

**Cómo aplicarlo.** Si cambia el dibujo de Tino, regenerar los fotogramas desde las filas del SVG (mover filas enteras, nunca girar). Safari no cambia el favicon al vuelo, así que ahí no se anima. Con movimiento reducido, ni el logo ni el favicon se mueven.
