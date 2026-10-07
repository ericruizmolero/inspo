---
title: Los campos toman el foco en 350 ms
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** El anillo de foco de los campos aparecía de golpe: `.cr-prompt` (el campo grande de la portada) ponía su sombra ember al enfocar sin transición, y `.input` y `.cr-input` pasaban de `outline: none` a un contorno de 2 px, que no se puede fundir porque antes no existía.

**Decisión.** El anillo está siempre, transparente, y lo que cambia al enfocar es su color: `.input` (`app/globals.css`) y `.cr-input` (`components/criterio/criterio.css`) llevan `outline: 2px solid transparent` en reposo y `outline-color: var(--focus)` en `:focus-visible`, con `transition` de 350 ms y `--ease-out` en `outline-color`, `border-color`, `background-color` y `box-shadow`. `.cr-prompt` hace lo mismo con su sombra (`box-shadow: 0 0 0 2px transparent` en reposo, ember al enfocar) y su borde, y el campo del buscador (`.sb__field`) funde su sombra de foco en los mismos 350 ms. Las microinteracciones de botones y pestañas siguen en 100 a 150 ms.

**Por qué.** Eric, 07-10: "la transición de input que sea de 350ms por ejemplo cuando se pone focus y así". Interpretación: entrar en un campo es un cambio de estado que se habita, no un toque; merece más tiempo que un hover.

**Cómo aplicarlo.** Un campo nuevo no inventa su foco: hereda el de `.input` o `.cr-input`. Si un campo necesita su propio anillo (una sombra en vez de un contorno), lo deja presente y transparente en reposo y transiciona su color en 350 ms con `--ease-out`.
