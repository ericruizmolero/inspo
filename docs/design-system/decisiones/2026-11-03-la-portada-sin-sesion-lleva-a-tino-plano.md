---
title: La portada sin sesión lleva a Tino plano en la barra
date: 2026-11-03
status: vigente
kind: diseño
supersedes: la parte de la barra de la portada de "La criatura es el logotipo y el favicon, y nada más por ahora" (2026-10-07)
---
**Contexto.** Con el favicon ya en Tino, la barra de la portada sin sesión (`GuestStart`) seguía pintando la criatura verde de `Logo`. Eric lo vio en criterio.design el 03-11 con la captura de la barra: "aquí hay que actualizar a Tino también".

**Decisión.** La barra lleva `TinoMark` a 32: el dibujo del favicon (`app/icon.svg`) en línea, con el cuerpo en `--text` y el visor recortado del suelo de la barra (`--tino-mark-visor: var(--bg)`), para que siga el tema de la app. El resto de sitios con `Logo` (login, Ajustes, Admin, librería, invitación, conector) siguen con la criatura de momento.

**Por qué.** Eric: "aquí hay que actualizar a tino también". Usar el dibujo plano y no el peluche 3D en una marca de 32 px es interpretación nuestra: el 3D carga three.js y a ese tamaño no se lee.

**Cómo aplicarlo.** Donde la marca pase a ser Tino, `TinoMark` con su `size` y el `--tino-mark-visor` del suelo que tenga detrás; nunca un `<img src="/icon.svg">`, que sigue el tema del sistema operativo y no el de la app.
