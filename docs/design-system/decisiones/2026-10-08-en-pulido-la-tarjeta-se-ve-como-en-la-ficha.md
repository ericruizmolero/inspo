---
title: En Pulido la tarjeta de delante enseña la referencia como la ficha, y un post es su post
date: 2026-10-08
status: vigente
kind: diseño
supersedes: 2026-10-06-el-pie-de-pulido-ensena-el-texto-del-post-y-la-nota.md
---
**Contexto.** En el tornado de Pulido cada tarjeta era una foto: la miniatura de la referencia. En un post de X sin fotos esa miniatura es el avatar de su autor, así que la tarjeta de delante era la cara de Javi Consuegra a toda página y lo que decía el post iba debajo, en el pie, cortado a tres líneas. La ficha, en cambio, enseña el post entero en su caja (`PostView`, `.pv`): quién, cuándo, el texto y sus fotos o vídeo.

**Decisión.** La tarjeta de Pulido enseña la referencia como la enseña su ficha (`components/PolishView.tsx`, `Face`):
- Un post de X es la misma caja que la ficha (`PostBox`, sacada de `components/PostView.tsx`): avatar, autor, @usuario, fecha, texto, fotos; un vídeo o gif se ve por su fotograma mientras la tarjeta pasa y se reproduce solo en la de delante (`playing`). La tarjeta es tan alta como el post, hasta 36 em (`.polish__post`), y pasada esa altura se funde al pie como en el tablón (`is-cut`). Su tipografía va en el em de la tarjeta, como la de un texto, para escalar con el zoom (`.polish .pv`).
- Un texto lleva, como en la ficha, la etiqueta "Texto" sobre su título (`.polish__text-kind`).
- Una web, una imagen o un vídeo siguen siendo su captura o su fotograma, que es lo que la ficha enseña primero.
- El pie (`.polish__now`) ya no repite lo que dice la tarjeta: con un post o un texto delante solo pinta la nota del equipo y los votos, y si no hay nada, no se pinta. Con una web o una imagen sigue diciendo su nombre. La nota de quien guardó la referencia y las caras siguen como en la decisión del 06-10.
- El post se lee una sola vez por sesión para todas las vistas (`components/post-cache.ts`, `usePost`): ficha, tarjeta del tablón sin imagen y tarjeta de Pulido. En Pulido solo lo piden las tarjetas a tres puestos de la de delante (`POST_NEAR`); las demás enseñan lo que ya dice el nombre hasta que llegan.

**Por qué.** Eric, 08-10, con la captura de la cara del autor en grande: "en el pulido un tuit se tiene que mostrar como en la ficha eh. bueno, todo se tiene que mostrar como se muestra en la ficha actualmente"; "que aquí en pulido la card sea el tuit no la foto en grande del autor". Al verlo: "está perfecto ya". Que el pie deje de repetir el texto y que las lejanas no pidan el post es interpretación mía: el texto ya está en la tarjeta, y treinta tarjetas montadas pidiendo a la vez saturan el servidor de desarrollo.

**Cómo aplicarlo.** Una referencia se dibuja de una sola manera en toda la app, la de su ficha; una vista nueva reutiliza esa caja (`PostBox`, `PageView`, `TextPage`) en vez de inventar otra lectura. Lo que ya dice la tarjeta no se repite en su pie. Un dato que varias vistas piden al servidor se lee una vez y se comparte (`post-cache.ts`), pasando por `useState` por el React Compiler.
