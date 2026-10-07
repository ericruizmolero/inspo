---
title: En la ficha, la tarjeta de la página termina donde termina la captura
date: 2026-10-07
status: vigente
kind: diseño
---

**Contexto.** En la ficha de una referencia (`components/ItemPanel.tsx`), la tarjeta de la página (`.ip-card--page`) se estiraba siempre a la altura del escenario. Con una captura más corta que el escenario (una og:image, una captura parcial), el ancho de la imagen llenaba la tarjeta pero debajo quedaba una banda oscura vacía hasta el borde.

**Decisión.** Cuando la tarjeta lleva una página o una imagen (`PageView`, `.pn-wrap`), deja de estirarse: `align-self: center` y `max-height: 100%` en `.ip-card--page.cr-viewer-media:has(> .pn-wrap)` (`app/globals.css`). La tarjeta mide lo que la captura y se centra en el escenario; si la captura es más alta que el escenario, la tarjeta se queda a su altura y la página hace scroll dentro, como hasta ahora. Mientras la captura carga, `.pn-page` con brillo guarda `min(70svh, 100%)` de alto para que la tarjeta no aparezca pequeña y dé un salto. Vídeo, post y texto (`.ip-media`, `TextPage`) siguen llenando la tarjeta.

**Por qué.** Eric, 07-10, con una captura que acababa al 85 % de la tarjeta: "ese espacio abajo que queda cuando una captura no ocupa todo tenemos que arreglarlo". Interpretación: el marco es de la captura, no del escenario; lo que sobra no se rellena, se quita.

**Cómo aplicarlo.** Un contenedor que enmarca una imagen se ajusta a ella (y como mucho al sitio que hay), nunca al revés. Se comprueba con una captura corta y con una página larga: la corta centrada sin banda, la larga con scroll.
