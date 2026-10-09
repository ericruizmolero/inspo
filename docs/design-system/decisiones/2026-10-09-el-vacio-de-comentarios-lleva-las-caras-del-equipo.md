---
title: El vacío de comentarios lleva las caras del equipo en zigzag
date: 2026-10-09
status: vigente
kind: diseño
---
**Contexto.** Antes de fusionar el sistema de Alberto (7 de octubre) la conversación vacía de una referencia enseñaba tres filas fantasma con las fotos reales del equipo y dos barras apagadas por fila, la segunda fila desplazada. Al pasar el vacío al `EmptyState` del sistema, que va sin dibujo, las caras desaparecieron y quedó solo el texto con los nombres.

**Decisión.** El vacío de la conversación (`CommentsPanel`, `.cm-empty`) vuelve a llevar las caras como `art` del `EmptyState`, colocadas bajo la frase y antes de las sugerencias (`.cm-empty .cr-empty-title, .cm-empty .cr-empty-text { order: -1 }`): hasta tres filas (`.cm-empty__ghosts`, 200 px de ancho como mucho), primero quien mira y después el resto del equipo, cada una con su `Avatar` de 20 (foto o inicial en su tono, al 80 %) y una sola barra (`.cm-empty__bars`, 6 px, `--radius-pill`, `--chrome-raised`) de ancho distinto; la segunda fila entra 24 px para el zigzag. Cada fila aparece con `pop-in` 90 ms después de la anterior; con reduced-motion, sin animación. Como las caras ya dicen quién lo leerá, la frase se queda en una ("Di qué te ha gustado o pega una captura.") y no repite los nombres. Solo en la conversación: `Balloon`, `TipWindow` y los demás vacíos siguen sin dibujo.

**Por qué.** Eric, 9 de octubre: "esta parte de aquí antes teníamos las fotitos del equipo en zig zag, recuperemos", "estaba más integrado con el texto", "menos textos quizás", "estaban debajo del subtitle" y "minimalista". Interpretación nuestra: las caras dicen quién va a leer el comentario mejor que la lista de nombres sola, y el zigzag ya dibuja el hilo que está por empezar. No contradice que la criatura sea solo el logotipo: aquí el dibujo es el equipo, no la mascota.

**Cómo aplicarlo.** Un vacío que espera a personas concretas puede llevarlas como `art`; un vacío de datos o de ajustes sigue sin dibujo. No añadir keyframes nuevos para esto: la entrada es `pop-in` con `animation-delay`.
