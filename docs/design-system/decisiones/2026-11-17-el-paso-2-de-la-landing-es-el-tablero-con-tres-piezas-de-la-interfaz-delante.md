---
title: El paso 2 de la landing es el tablero con tres piezas de la interfaz delante
date: 2026-11-17
status: vigente
kind: diseño
---
**Contexto.** El paso 2, "Decide together", enseñaba la ventana de la app centrada con el tablero en rejilla: las mismas referencias que el paso 1, otra vez en fila. Se exploraron dos rondas (`design-explorations/paso-2-decidir.html` y `paso-2-ui.html`); en la segunda, todas enseñaban la interfaz sin repetir esa composición.

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro`, el paso 2 (`.st4-decide`) mantiene la ventana viva del tablero detrás, atenuada por un velo de papel (`.dz-veil`, encima de la ventana y debajo de las piezas, porque el JS fija la opacidad de la ventana), y delante tres piezas de la app tal como la usa la gente, una por verbo del subtítulo, cada una con su etiqueta (`.dz`, `data-ui`). Medidas, colores y textos salen de la app en marcha y de `lib/i18n`; la letra es Geist, la de la app (`/assets/fonts/geist/`, OFL):
- **Comment**: el panel de comentarios del visor (`CommentsPanel`): "Comments" en 22 px y "2 comments", raya debajo, avatar de 26 px, nombre, fecha ("13 Oct"), el texto bajo el nombre, la respuesta de Alberto colgada de una raya, "Reply" con "1 reply", y el campo "Add a comment, or paste a screenshot…" con su botón de imagen, "Send" y la ayuda de teclas.
- **Compare**: dos baldosas del tablero (`InspoCard`) con su nota debajo (avatar de 20 px, nombre y texto en 13 px). La app no tiene una vista de comparar; son dos tarjetas del tablero.
- **Vote**: el globo de Tino en Pulido (`PolishView`): "TINO 1 / 9", "Keep this one?", "Eric already keeps it." (`polish.keeps`), Forget y Keep con sus teclas ← →, y "The whole team votes: what everyone forgets leaves."
Entran al llegar (`.dz.on`). En teléfono se quita Compare y el campo de escribir, y el voto va a media altura.

**Por qué.** Alberto: "this part is a bit repetitive vs the last one" y "i want to show the ui but without repeating the same layout"; eligió la B de la segunda ronda (interfaz despiezada). Después pidió revisar el panel de comentarios ("i'm not sure it's very accurate"): se rehízo con la estructura de `CommentsPanel` y se quitaron las chinchetas, que no existen. Luego: "do it real it need to be like the ui the user is going to use".

**Cómo aplicarlo.** Lo que la landing enseña de la app es la app: se abre en local, se mide (estilos calculados) y se copia con sus textos de `lib/i18n`, nunca una idea de ella. La respuesta de Alberto está escrita para la página; la nota de Flodesk en el tablero de la demo es suya (`ITEMS`, `WHO.L`, `.av.l`).
