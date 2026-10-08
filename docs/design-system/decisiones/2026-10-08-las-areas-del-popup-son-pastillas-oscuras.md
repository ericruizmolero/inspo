---
title: Las áreas del popup de la extensión son pastillas oscuras, solo la elegida se rellena
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** Con el sistema Criterio (7 de octubre) las ocho áreas del formulario del popup pasaron a ser Chips de papel con borde de tinta: ocho pastillas claras sobre el cromo oscuro, el bloque más blanco de la ventana, además de los botones de papel.

**Decisión.** En `extension/chrome/popup.css` la `.pill` vuelve a ser como la Chip dentro de Añadir (`.add__area`): 28 px, transparente, línea `--chrome-raised`, texto `--chrome-text-muted`; al pasar por encima, texto papel y línea `--chrome-muted`; elegida (`aria-pressed="true"`), invertida a papel con texto tinta. Los botones de papel con bisel y el Guardar ember se quedan como están.

**Por qué.** Eric, 8 de octubre: "el diseño de la extensión tiene que cambiar un poco a como la teníamos antes, con lo nuevo pero sin tanto background pill blanca". El popup es cromo y debe seguir oscuro; el papel queda para lo que se pulsa de verdad y para lo elegido (interpretación nuestra).

**Cómo aplicarlo.** En un formulario sobre cromo las opciones múltiples se pintan calladas y solo la elegida se rellena, como en Añadir. El papel con bisel es para botones, no para listas de opciones.
