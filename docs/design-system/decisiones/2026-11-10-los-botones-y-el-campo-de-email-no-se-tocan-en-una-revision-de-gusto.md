---
title: Los botones y el campo de email no se tocan en una revisión de gusto
date: 2026-11-10
status: vigente
kind: diseño
---
**Contexto.** En una revisión de la landing de marketing con la skill `design-taste-frontend`, la skill marcó como fallo las sombras, los bordes y el papel crema. Se quitaron de toda la página, y con ellos también el bisel, el borde de tinta, la sombra de tecla y el relleno de papel de los botones y del campo de email.

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro`, los controles conservan su aspecto de marca: `.btn`, `.btn-paper`, `.btn2`, `.step`, los chips de `.ask-chips`, el botón Menu (`.menu-panel` cerrado), `.menu-vid`, `.key2` y el campo `.invite-row` llevan borde de tinta de 1,5 px, `--bevel` o `--bevel-pressed`, la sombra de tecla `0 var(--lift) 0 var(--ink)` y el relleno `--paper` #EDE6D6 y `--paper-l` #F6F1E6. El bloque de la revisión los excluye de la regla que quita sombras y les devuelve esos tokens aunque el fondo de la página cambie.

**Por qué.** Alberto: "you updated the buttons and input, this is part of our brand, we cannot update this". El botón ya era la firma del sistema ([Botones](../botones.md)).

**Cómo aplicarlo.** Cuando una skill o una revisión externa marque el bisel, el borde de tinta o la sombra de tecla como fallo, en botones y campos no se aplica: se anota como excepción de marca y se pasa la regla con `--allow` si la herramienta lo permite. Lo que la revisión cambie en lo demás (fondos, tarjetas, etiquetas) no arrastra a los controles.
