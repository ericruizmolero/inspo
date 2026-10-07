---
title: Las piezas pequeñas copian a las grandes, el tooltip es de mantequilla y la escala es estricta
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Tras adoptar el sistema quedaban elementos hechos a mano (tooltips nativos, spinners, teclas, separadores, menús) que no se parecían a nada del sistema.

**Decisión.** Pasada de coherencia: lo hecho a mano se cambia por componentes del sistema y se añaden solo piezas pequeñas copiadas de las que ya existen (`components/criterio/index.tsx`, bloque "The 2000 nod"): el tooltip es un globo de mantequilla pequeño (`TipLayer`, `data-tip`), lo que ensancha el uso de butter, que era solo la voz de la criatura; la tecla con bisel (`Key`); la espera son cuatro celdas con una ember que avanza (`Busy`, sustituye a todo spinner); la barra de estado son celdas hundidas (`StatusBar`); el separador es la línea grabada (`Separator`); el interruptor copia el pozo de la casilla y el bisel del botón (`Switch`). La escala de texto es estricta: 14 y 11 desaparecen; el cuerpo de `Balloon` y `TipWindow` pasa a 15. Hay un `Button` danger (`--danger-deep`) para confirmar lo que destruye. Un chip elegido se invierte a tinta (antes en Board no se distinguía del normal).

**Por qué.** Alberto: "make everything most cohesive… this vibe of windows 2000".

**Cómo aplicarlo.** Antes de dibujar una pieza pequeña, mira si una de estas ya la resuelve. Si hace falta una nueva, copia el bisel, el pozo o la línea grabada de las existentes en vez de inventar otro trazo. Nada de `title` nativo para tooltips.
