---
title: La portada de un tablero es su masonry en pequeño
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Las tarjetas de proyecto de la casa y del Inbox vacío (`BoardCard`) enseñaban las ocho primeras referencias en una cuadrícula fija de 4 x 2 baldosas casi cuadradas, recortadas por arriba. Dentro, el tablón es un masonry de columnas con cada tarjeta a su altura. La portada prometía una cosa y dentro había otra.

**Decisión.** `BoardCard` acepta `columns` (`BoardTile[][]`, cada baldosa con su `ratio`) y las pinta como columnas apiladas (`.cr-boardcard-mosaic-masonry`, `.cr-boardcard-col`), cada baldosa con su `aspect-ratio` y recortadas en el borde inferior del mosaico. `boardColumns` en `components/ProjectChooser.tsx` reparte las referencias con la misma regla que `layoutBoard` de `components/Grid.tsx` (la siguiente va bajo la columna más corta, en el orden del tablón, los textos fuera) y con los mismos `ratioOf` del tablón: cinco columnas, el hueco de 6 px como fracción de columna y se deja de pedir imágenes cuando el mosaico ya está lleno. La miniatura mide la imagen al cargar y se lo dice al `measure` del tablón, como hace una tarjeta, así que la portada y el tablón se abren con las mismas formas. Los `tiles` planos siguen existiendo para otros usos.

**Por qué.** Eric, 07-10: "las pastillas de tablón tienen que ser fieles al masonry que te vas a encontrar dentro, el diseño tiene que ser masonry ahí". Las cinco columnas también son suyas: "igual que entre una columna más en cada".

**Cómo aplicarlo.** Una portada que resume un sitio se construye con la misma regla de colocación que el sitio, no con una rejilla aparte. Si cambia cómo coloca el tablón (número de columnas, alturas, orden), cambia igual `boardColumns`.
