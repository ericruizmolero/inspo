---
title: En la portada los precios van después de criterio.md y antes del pie
date: 2026-11-23
status: vigente
kind: diseño
supersedes: dónde van los planes en la portada (decisión del 20-11, entre la ventana del producto y criterio.md)
---
**Contexto.** Desde el [20-11](2026-11-20-la-portada-lleva-los-planes-y-su-formulario-apunta-a-la-lista.md) los cuatro planes de la portada iban entre la ventana del producto y criterio.md, para que criterio.md y el cierre formaran un solo tramo oscuro.

**Decisión.** El orden de `/` y `/es/` es héroe, vídeo (la ventana del producto), manifiesto (criterio.md, `section.mf`), precios (`HomePlans.astro`, `#pricing`) y cierre con el pie (`section.end`). En `marketing-site/video/landing/plantilla.html` la marca `%%PRICING%%` va justo antes de `section.end`, y `construir.py` vuelve a generar las dos páginas. Como ahora los precios están sobre papel entre dos tramos oscuros, `.pricing` lleva también margen abajo, el mismo que separaba criterio.md: `clamp(120px, 22svh, 210px)`. El resto de la decisión del 20-11 no cambia.

**Por qué.** Eric, 23-11: "creo que el pricing tiene que estar antes del footer... hero -> video -> manifiesta -> pricing -> footer". Interpretación nuestra: primero se cuenta qué es y por qué, y el precio llega justo antes de apuntarse.

**Cómo aplicarlo.** Se cambia en `plantilla.html`, nunca en `src/pages/`. "Precios" en la cabecera sigue bajando a `#pricing`. El patrón está en [patrones](../patrones.md) y la ruta en [mapa](../mapa.md).
