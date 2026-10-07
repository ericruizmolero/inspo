---
title: La cara de un comentario se centra en su primera línea
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Bajo una tarjeta del tablón, el comentario (`.tile__note`) lleva el avatar de 20 px a la izquierda y el texto a 13 px con altura de línea 1.3 (16,9 px). El avatar iba alineado al borde superior del texto (`align-items: flex-start`), así que su centro quedaba 1,5 px por debajo del centro de la primera línea. Con una línea casi no se nota; con dos, la cara parece flotar entre ambas.

**Decisión.** En `app/globals.css`, el avatar (`.tile__note > .cr-avatar`) y la pila (`.tile__note-stack`) llevan `margin-top: calc((var(--fs-small) * var(--lh-label) - 20px) / 2)`, que los centra en la primera línea sea cual sea el número de líneas. El contador de respuestas (`.tile__note-count`) deja el `margin-top: 2px` a ojo y se centra en esa misma línea con el mismo cálculo sobre sus 12 px. El pie de Pulido (`.polish__say`) no cambia: su avatar de 18 px ya coincide con su línea de 18,85 px.

**Por qué.** Eric, con una captura del tablón: "alinea el foto con el comentario bien horizontalmente, cuidado estas microcosas".

**Cómo aplicarlo.** Cuando una cara, un icono o un contador acompañan a un texto que puede ocupar varias líneas, se centran en la primera línea, no en el bloque ni en su borde superior. El margen se calcula con los tokens (`--fs-*` por `--lh-*` menos el alto del elemento, entre dos), no con un píxel a ojo, para que sobreviva a un cambio de tamaño. Estas desviaciones de uno o dos píxeles cuentan: se revisan antes de dar la tarjeta por terminada.
