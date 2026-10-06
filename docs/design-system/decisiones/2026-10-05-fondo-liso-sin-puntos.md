---
title: Fondo liso, sin trama de puntos
date: 2026-10-05
status: vigente
kind: diseño
---
**Contexto.** La pantalla de inicio de un workspace ("¿Qué vas a hacer hoy?") llevaba una trama de puntos de fondo. Venía del lienzo infinito (PR #56), donde decía "esto es una superficie que se arrastra"; de ahí se copió al mar de nodos del Sistema y al inicio. El lienzo y el mar de nodos se retiraron y sus puntos con ellos, así que el inicio era la única vista que los conservaba, sin que nadie lo hubiera decidido.

**Decisión.** Fuera la trama de `.chooser` en `app/globals.css`: el fondo es `var(--bg)` liso, como en el resto de vistas.

**Por qué.** Eric preguntó si había sido deliberado y, al saber que era un resto, pidió "quitalos". Interpretación: la trama ya no significa nada porque ninguna vista se arrastra, y hacía que el inicio pareciera de otra app.

**Cómo aplicarlo.** Las vistas van sobre `--bg` liso. Una textura o trama de fondo solo entra si dice algo de cómo se usa la vista (por ejemplo, un lienzo que se arrastra), y entonces en todas las vistas que funcionen así.
