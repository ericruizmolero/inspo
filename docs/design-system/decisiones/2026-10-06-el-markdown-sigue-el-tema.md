---
title: El panel de Markdown sigue el tema: hoja blanca en claro, panel oscuro en oscuro
date: 2026-10-06
status: vigente
kind: diseño
supersedes: La parte de "panel oscuro en los dos temas" de criterio.md se abre en Markdown, con el color de un editor (05-10)
---
**Contexto.** El criterio.md en vista Markdown era un panel oscuro en los dos temas, "como cualquier bloque de código". En tema claro es la superficie más grande de la vista Sistema, y la página quedaba casi entera en negro. Eric, 06-10, con una captura del tema claro: "en white-mode tengo mis dudas de si poner el marco del markdown en negro", y después: "falta resolver lo del markdown en white-mode".

**Decisión.** El panel `.mdv` (`components/SystemMarkdown.css`) sigue el tema. En oscuro no cambia. En claro es una hoja blanca (`--md-bg: var(--surface)`) con texto en `--text-2`, títulos y código en azul `#0550ae`, citas en verde `#1a7f37` y negritas en `--text`: los mismos papeles de color, bajados para leerse sobre blanco. Todos los colores del panel pasan a variables `--md-*` (se añaden `--md-fill`, `--md-fill-2`, `--md-edge`, `--md-over`, `--md-pin*` y `--md-pop*`), sin blancos ni negros sueltos en las reglas; los valores claros están en `:root[data-theme="light"] .mdv:not(.mdv--doc)`, con rellenos hechos con `color-mix` sobre `--text`. La vista Documento (`.mdv--doc`) no cambia. El Markdown sigue siendo la primera pestaña, en mono a 13 px y con color.

**Por qué.** La duda es de Eric; que la salida sea seguir el tema y no dejarlo oscuro es propuesta mía, y está pendiente de que la vea: el principio 8 pide dos temas de primera, y las excepciones que se quedan oscuras (la tarjeta de recursos, los overlays sobre capturas) son piezas pequeñas, no la superficie principal de una vista. El fichero se sigue leyendo como fichero por la mono y el color de sintaxis, no por el fondo.

**Cómo aplicarlo.** Una pieza grande no se queda oscura en tema claro "porque es código". Al añadir algo dentro de `.mdv`, usar las variables `--md-*`; si hace falta un color nuevo, se define en los dos bloques (oscuro y claro) a la vez.
