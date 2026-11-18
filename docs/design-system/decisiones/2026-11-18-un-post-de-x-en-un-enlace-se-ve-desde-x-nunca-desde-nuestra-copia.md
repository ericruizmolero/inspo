---
title: Un post de X en un enlace compartido se ve y se reproduce desde X, nunca desde nuestra copia
date: 2026-11-18
status: vigente
kind: producto
---
**Contexto.** Desde el 06-10 lo importado de X no sale del espacio con nuestra copia ([decisión](2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md)). En el tablón compartido (`/s/<token>`) eso dejaba cada post como una tarjeta de palabras: sin foto, sin vídeo, y con el texto recortado del resumen. Eric, al compartir un tablón: "cuando compartes todo al público hay cosas que no se ven... tuit de vídeo que no se ven como en el tablón".

**Decisión.**
- El enlace lee el post de X en el momento (`app/s/[token]/post/route.ts`, `readPost` de `lib/posts.ts`) y devuelve solo direcciones de X: la foto y el fotograma en `pbs.twimg.com`, el vídeo en `video.twimg.com`. Ningún fichero de `inspo/posts/` sale por el enlace, y `loadShareBoard` sigue sin dar miniatura de lo que cumple `staysInside`.
- La ruta solo atiende posts que están en el tablón del enlace (sin archivar, y dentro de `itemIds` si el enlace es de una selección).
- `components/post-cache.ts` pregunta a esa ruta cuando la página es `/s/<token>`, y a `/api/post` dentro de la app.
- La tarjeta (`components/InspoCard.tsx`, solo con `readOnly`) dibuja la foto o el fotograma de X y reproduce en bucle el fichero de X, como en el tablón. La ficha (`SharedPage` en `components/brand/ShareBoard.tsx`) enseña el post con `PostView`.
- Si X ya no da el post, no hay respaldo: la tarjeta se queda en sus palabras. Nuestra copia de respaldo es solo para el equipo.
- Pinterest, Are.na y Cosmos no cambian: sin imagen, con nombre y enlace.

**Por qué.** Eric, tras leer el cambio y su riesgo: "súbelo". Interpretación mía del motivo: lo que la decisión del 06-10 quería evitar era repartir desde nuestros servidores el trabajo de otros. Enseñar el post desde los ficheros de X es lo que hace un post incrustado, y si el autor lo borra desaparece también del enlace.

**Cómo aplicarlo.** Una superficie sin sesión que quiera enseñar un post lo lee con `readPost` y usa sus direcciones tal cual, nunca `ensurePost` ni `getStoredPost`. La página debe ir sin referrer (X niega sus ficheros a peticiones con el Referer de otro sitio); `/s/<token>` ya lo hace en sus metadatos.
