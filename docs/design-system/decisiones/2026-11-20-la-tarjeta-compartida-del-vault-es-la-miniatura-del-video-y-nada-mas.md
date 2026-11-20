---
title: La tarjeta compartida de una pieza del Vault es la miniatura de su vídeo y nada más
date: 2026-11-20
status: vigente
kind: diseño
supersedes: 2026-11-20-la-tarjeta-compartida-del-vault-no-lleva-marco-el-fondo-de-la-pieza-la-llena.md
---

**Contexto.** La tarjeta Open Graph de una pieza del Vault (`lib/vault-og.tsx`) se dibujaba: la imagen de la entrada, pequeña, sobre un fondo, con el nombre, la categoría y Tino debajo. Por la mañana se le quitó el marco negro y el fondo de la pieza pasó a llenarla; vista en Telegram con Aperture Loader seguía siendo una imagen pequeña sobre una losa gris con texto que el propio chat ya escribe al lado.

**Decisión.** La tarjeta es una sola imagen de la pieza que la llena entera (1200×630), sin nombre, fondo ni Tino. Por orden: la miniatura del vídeo que ofrece la página de Screen Studio (`og:image`), que `videoFromLink` trae como `frame` cuando el bucle se pasa por enlace y `setVaultVideo` guarda junto al vídeo en `<vídeo>.frame.jpg` (`frameKeyOf` y `pictureCard` en `lib/vault-frame.ts`); si no la hay, la imagen de la entrada recortada por el centro; si no hay ninguna, la tarjeta dibujada de antes (nombre, categoría y Tino sobre el `ground`). La miniatura se borra con su vídeo.

**Por qué.** Eric, 20-11: "todavía es bastante feo el thumbnail la verdad... que sea thumbnail de la propia captura de vídeo que se hace de screen studio y ya no?". Entre sacar el fotograma en el servidor con ffmpeg (dependencia nueva) y usar la miniatura que ya da Screen Studio, eligió la segunda.

**Cómo aplicarlo.** El bucle de una entrada se pasa por su enlace de Screen Studio (`video_url` en `add_to_vault`, o el campo de la ficha), no como fichero: solo así trae su miniatura. Una entrada cuyo vídeo se subió antes de este cambio, o como fichero, enseña su imagen recortada (una captura 4:3 pierde una franja arriba y abajo) hasta que se le vuelva a pasar el enlace. Probado con cuatro enlaces reales de Screen Studio en local; no probado todavía en producción.
