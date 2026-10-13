---
title: Las referencias del tablón no llevan marco de reloj
date: 2026-10-13
status: vigente
kind: diseño
---
**Contexto.** Eric propuso probar las tarjetas del tablón como las esferas de Apple Watch ("con ese border y demás, con cierto grado de 3D", la altura según cada imagen) y pidió que fuese reversible. Se montó en local: un interruptor `WATCH` en `components/Grid.tsx` que sumaba el grosor del bisel al alto de cada hueco, y CSS bajo `.board[data-watch] .tile` con un bisel casi negro, un canto plateado en degradado y sombras hacia abajo a la derecha.

**Decisión.** Descartado y revertido el mismo día, sin llegar a commit. La tarjeta sigue siendo el ReferenceTile de siempre (`.tile` en `app/globals.css`): sin borde, `--radius-lg`, la imagen tal cual a su altura y solo la línea de 1px de `.tile__media::after`.

**Por qué.** Eric lo vio en local y dijo "revertimos". No explicó el motivo; leerlo como que el marco le quitaba protagonismo a la referencia es interpretación nuestra.

**Cómo aplicarlo.** No vestir las referencias con marcos de dispositivo, biseles ni sombras 3D en el tablón. Si vuelve la idea, se reutiliza la técnica (el hueco crece `2 * bisel` en `layoutBoard` para que la rejilla no se mida), pero detrás de un interruptor y como prueba local.
