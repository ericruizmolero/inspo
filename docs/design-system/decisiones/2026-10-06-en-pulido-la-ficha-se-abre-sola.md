---
title: En Pulido la ficha se abre sola, sin anterior ni siguiente
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** La ficha de referencia (`ItemPanel`) lleva flechas a los lados y ← → para recorrer el tablero en su orden. Abierta desde la tarjeta de delante de Pulido heredaba esas flechas, así que dentro de un slider (el tornado) se abría otro.

**Decisión.** En `components/InspoClient.tsx`, `panelAt` no busca vecinas cuando la vista del proyecto es Pulido: `ItemPanel` recibe `onPrev` y `onNext` vacíos y no pinta `.ip-nav` ni escucha ← →. En el tablón, el Inbox y la búsqueda la ficha sigue recorriendo las referencias.

**Por qué.** Eric, 06-10: "si abres esa referencia se abre la ficha sí, pero ahí la ficha no tiene que ser slider. que se muestre solo esa y ya". Interpretación mía: en Pulido se decide una tarjeta cada vez y pasar de una a otra ya es cosa del tornado; dos formas de avanzar se pisan.

**Cómo aplicarlo.** Una ficha abierta desde una vista que ya recorre las referencias una a una se abre sola. Las flechas de la ficha son para las vistas donde se ven muchas a la vez.
