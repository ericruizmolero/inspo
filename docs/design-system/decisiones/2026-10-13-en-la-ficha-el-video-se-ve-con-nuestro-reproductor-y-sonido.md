---
title: En la ficha el vídeo se ve con nuestro reproductor, con sonido
date: 2026-10-13
status: vigente
kind: diseño
supersedes: 2026-10-08-en-pulido-la-tarjeta-se-ve-como-en-la-ficha.md (solo el añadido de la tarde: la ficha sin reproductor)
---
**Contexto.** Desde el 08-10 el vídeo de un post de X hacía en la ficha lo mismo que en Pulido: bucle mudo, sin controles. No había forma de oírlo ni de ir a un momento concreto, y el vídeo propio subido usaba los controles del navegador, distintos en cada uno.

**Decisión.** En la ficha, el vídeo de un post (no el gif) y el vídeo propio subido o de Screen Studio van dentro de `MediaPlayer` (`components/MediaPlayer.tsx`, `.mp`). El del post arranca como antes, en bucle y mudo; el subido arranca parado con el triángulo grande (`.mp__big`). Mudo y sin tocar, solo se ve el botón de sonido en la esquina (`.mp__corner`, `IconButton` default s con `mute`). Al pasar el ratón sube una barra de cromo sólido (`.mp__bar`, `--chrome` con la línea `--chrome-border`): play o pausa, el tiempo en cifras tabulares, la línea que se arrastra (`.mp__track`, relleno `--chrome-ink` por `transform`), sonido y pantalla completa, todos `IconButton` quiet s. La barra se va a los 1,5 s con el puntero quieto (`SLEEP_MS`), también en pausa, y vuelve al entrar o moverse por el vídeo. La primera vez que entra el sonido el vídeo vuelve al principio. Clic en un vídeo mudo le da sonido al momento (Eric, 13-10: "que si clickas en el video que salga ya sonido directamente"); con sonido, el clic pausa y reanuda; doble clic, pantalla completa; con el foco en el reproductor, Espacio o K, M y F. El vídeo de X sigue en su iframe sin Referer: los controles viven fuera y mandan sobre el `<video>` de dentro (`contentDocument`). Iconos nuevos en `Icon`: `pause`, `expand` y `collapse` (Phosphor). En Pulido y en el tablón nada cambia: bucle mudo. Mientras el vídeo suena (reproduciéndose y sin silenciar), la música de la app se calla y espera encendida; vuelve al pausarlo, silenciarlo o cerrar la ficha (`hush` en `components/SoundControl.tsx`). Eric, 13-10, sobre que sonaran los dos a la vez: "resolvemos esto si si".

**Por qué.** Eric, 13-10: "que el video lo puedas reproducir tranquilamente en la ficha con un reproductor que nosotros diseñemos y sonido"; luego "que se quite el reproductor cuando han pasado 1,5s" y "al hovering que aparezca otra vez".

**Cómo aplicarlo.** Todo vídeo que se mira (no un bucle de tarjeta) va en `MediaPlayer`, nunca con `controls` del navegador. Pasarle el `<video>` cuando exista (`video`) y la proporción (`ratio`); el medio lleva la clase `.mp__media`.
