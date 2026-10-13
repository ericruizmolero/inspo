---
title: En Pulido, un tuit con foto o vídeo dice en el pie quién lo escribió y cómo empieza
date: 2026-10-13
status: vigente
kind: diseño
---
**Contexto.** Desde el 13-10, un post de X con foto, vídeo o gif se ve en Pulido como su media sola, a toda la tarjeta (`.polish__solo`). El texto del tuit no salía en ningún sitio: el pie no decía nada de un post porque daba por hecho que la tarjeta ya lo enseñaba.

**Decisión.** Cuando la tarjeta de delante es un post que se ve como foto o vídeo (`postHasMedia` de su imagen, o el post leído trae media), el pie (`.polish__now`, `components/PolishView.tsx`) pinta encima de los botones una línea con la forma de la nota del equipo (`.polish__say--note`): el avatar del autor a 18 px, su nombre en negrita y el comienzo del texto, cortado a dos líneas y a `NOTE_MAX` caracteres. El post sale de `usePost` (ya leído por la tarjeta, sin otra petición); mientras llega, de su nombre (`postFromName`, exportado de `PolishFace.tsx`). Si además hay una nota del equipo, va debajo. Un post de solo palabras sigue sin pie propio, porque la tarjeta ya es su texto.

**Por qué.** Eric: "si sale foto o video del tuit al menos abajo encima de los botones que esté el inicio de lo que es el tuit escrito como cuando es un comentario de alguien".

**Cómo aplicarlo.** El pie de Pulido completa lo que la tarjeta no enseña: si la tarjeta deja fuera el texto de una referencia, el pie lo trae con la forma de nota.
