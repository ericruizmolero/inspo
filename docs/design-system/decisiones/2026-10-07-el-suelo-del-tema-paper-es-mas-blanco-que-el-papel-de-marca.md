---
title: El suelo del tema Paper es más blanco que el papel de marca
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** En el tema Paper el fondo de página era `--paper` (#EDE6D6), el papel de marca, y las tarjetas y el cromo iban en `--paper-light` (#F6F1E6). Vistas enteras como Descubrir se veían de un beige uniforme, con poco aire entre suelo y tarjeta.

**Decisión.** El suelo del tema Paper es casi blanco: `--bg` y `--surface-page` son `--paper-white` (#FCFAF6), token nuevo en `:root` de `app/globals.css` junto a la paleta de marca. Lo que se apoya en él es blanco puro: `--panel`, `--surface`, `--surface-raised`, `--chrome` y `--chrome-panel` valen #FFFFFF. (Primero se probó suelo `--paper-light` y piezas paper-white; Eric pidió "algo más blanco todavía".) El papel de marca `--paper` no cambia: sigue en el botón secundario y como suelo de ventanas, menús y tips (`.cr-window`, `.cr-menu`, `.cr-tip`), que son papel e ink en los dos temas. Los campos siguen en blanco puro.

**Por qué.** Eric, 07-10, con Descubrir en claro: "yo creo que haría el fondo más blanco, no? Que tan pastel...", y al ver el primer paso, "igual algo más blanco todavía?"; con el segundo, "perfecto así". Interpretación nuestra: el papel de marca funciona en una pieza (un botón, una ventana) y cansa como fondo de toda la pantalla; el suelo gana luz y las tarjetas recuperan el relieve.

**Cómo aplicarlo.** En Paper, suelo paper-white, piezas encima en blanco, papel de marca solo en controles y ventanas. Los campos, también blancos, se distinguen de la tarjeta por su línea de 1 px. Si una vista sigue viéndose plana en claro, se revisa su token de superficie, no se oscurece el suelo.
