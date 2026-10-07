---
title: El segmentado de papel tiene talla s para barras dentro de la página y un borde sutil
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** La barra de Descubrir (pestañas Ejemplos, Recursos, Skills; a la derecha Todo, Recién llegados, Destacados y el botón Temas) usaba el `SegmentedControl` de papel en su única talla, 44, y el botón en m. El pozo llevaba el borde de los campos (`--field-border`, 1,5 px; en Board un gris claro) que sobre el fondo oscuro se veía como una línea blanca alrededor de cada grupo.

**Decisión.** En `components/criterio/criterio.css`: el pozo del segmentado de papel (`.cr-seg-paper`) pasa a `1px solid var(--border)` en los dos temas, sin tocar el hundido ni la tecla elegida (papel con bisel). Nueva talla `s` (`.cr-seg-s`, prop `size="s"` de `SegmentedControl`): 34 de alto, 2 px de relleno, opciones de 28 con `--fs-small` y radio 6. Descubrir (`components/Discover.tsx`) usa la talla s en sus dos segmentados y el botón Temas baja a `cr-btn-s` con el chevron a 16. Los campos siguen con su borde: el cambio es del segmentado.

**Por qué.** Eric, 07-10: "estos los veo muy grande y el border blanco sobra realmente, o hay que atenuarla mucho". Interpretación: la barra de una sección es una barra de herramientas, y las barras van en s (34) según fundamentos; el pozo ya se lee por el hundido y la tecla, el borde solo añade ruido.

**Cómo aplicarlo.** Un segmentado de papel al lado de un `Button` m va en m (44); en una fila de herramientas dentro de la página (cabeceras de sección, filtros) va en s (34) con botones s. El borde del pozo es siempre la línea sutil del tema, nunca la de los campos.
