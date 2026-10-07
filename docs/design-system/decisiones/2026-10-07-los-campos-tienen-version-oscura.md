---
title: Los campos tienen versión oscura, un pozo casi negro con texto papel
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** El sistema define el campo como un pozo hundido blanco con borde de tinta. Sobre Board, un campo blanco era una mancha.

**Decisión.** En Board, `--field` es `#0A0A09` con texto `--field-ink` papel, borde `--field-border` gris (`#6E695F`) de 1,5 px y placeholder `--field-placeholder`; en Paper sigue blanco con tinta y una línea suave de 1 px (`--field-stroke`, `#D9D1BF`), más blanda que la tinta de los botones. Casillas, interruptores y pistas de progreso usan el mismo pozo (`--sunken`). Botones y chips mantienen el borde de tinta.

**Por qué.** Alberto: "make a inputs dark mode version too". Y sobre el borde en Paper: "softer".

**Cómo aplicarlo.** Un campo nuevo es `TextField`, `TextArea` o `.cr-input`; nunca un fondo ni un borde propios. Lo que escribe la persona va siempre en el pozo.
