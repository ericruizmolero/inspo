---
title: La ficha solo enseña la referencia, centrada, sin rectángulo alrededor
date: 2026-10-08
status: vigente
kind: diseño
supersedes: 2026-10-07-la-tarjeta-de-la-pagina-termina-donde-termina-la-captura.md
---
**Contexto.** El 07-10 la tarjeta de la página de la ficha (`.ip-card--page`) dejó de estirarse a la altura del escenario, pero solo para capturas e imágenes (`:has(> .pn-wrap)`). Un post de X, un vídeo o un texto seguían dentro de un rectángulo con borde y fondo a toda la altura, con el post pegado arriba a la izquierda y un vacío oscuro debajo.

**Decisión.** La tarjeta termina donde termina la referencia para todo (`align-self: center; max-height: 100%` sin condición, `app/globals.css`). Cuando lo que hay dentro ya se dibuja solo (`.ip-media`: la caja del post `.pv`, el reproductor), la tarjeta no pinta nada (fondo transparente, sin borde) y el post lee a 600 px de ancho, centrado. Una captura larga o un post con muchas fotos siguen haciendo scroll dentro, con el escenario como tope.

**Por qué.** Eric, viendo la ficha de un post: "tenemos que hacer que solo esté el elemento a ver, y centrado, el resto del rectángulo no se tiene que ver, así con todas".

**Cómo aplicarlo.** En la ficha, lo que se ve es la referencia y nada más: ni marcos ni bandas vacías. Un tipo nuevo de referencia trae su propia caja si la necesita (como el post) y la tarjeta de la ficha se limita a centrarla.
