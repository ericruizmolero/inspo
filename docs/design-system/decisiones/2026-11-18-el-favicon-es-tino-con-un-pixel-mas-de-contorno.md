---
title: El favicon es Tino con un píxel más de contorno; el logo sigue con el dibujo original
date: 2026-11-18
status: vigente
kind: diseño
---
**Contexto.** El favicon era el dibujo de Eric tal cual ([Tino en píxeles](2026-11-06-tino-en-pixeles-en-todas-partes.md)): 22 × 20 celdas en un lienzo de 24. En la pestaña se pinta a 16 px, cada celda mide 0,67 px, y Tino quedaba flaco y con el borde derecho del visor casi perdido. Eric: "el favicon de criterio que tenemos no parece el pixelado, no? [...] el contorno negro hay que aumentar 1px de grosor", y aclaró que era la línea "que rodea al Tino, orejas y cara", no el visor.

**Decisión.** En el favicon la silueta crece una celda hacia fuera por todo su contorno (cuerpo, cara y orejas) y ocupa el lienzo de 24 de lado a lado. El hueco entre las orejas y el visor no se tocan, para que las orejas no se fundan; el borde derecho del visor gana así una celda. Ficheros: `app/icon.svg`, `app/favicon.ico` (16 a 64), `app/icon.png` (256), y en la web de marketing `public/icon.svg`, `public/favicon.ico` y `public/assets/marca/conejo-icono.svg`. `TinoMark`/`Logo`, los iconos de la extensión, `app/apple-icon.png` y `public/app-icon-512.png` siguen con el dibujo original: se ven a tamaños donde no pierde peso.

**Por qué.** Eric, al ver la comparación: "estos me gusta". Que solo haga falta en el favicon es interpretación mía: es el único sitio donde el dibujo se pinta por debajo de su rejilla.

**Cómo aplicarlo.** El trazado del favicon ya no es el de `components/TinoMark.tsx`: si cambia el dibujo de Tino, el favicon se vuelve a sacar engordando una celda. Un icono nuevo por debajo de 24 px parte del trazado del favicon; uno mayor, del de `TinoMark`.
