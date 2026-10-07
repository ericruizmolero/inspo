---
title: Dentro de un menú el texto usa los tokens del menú, no la tinta del papel
date: 2026-10-07
status: vigente
kind: desarrollo
---
**Contexto.** El menú de Skills de criterio.md (`components/SkillsMenu.css`) pintaba cada fila con `--ink` y el hover con `--disabled`: tokens de papel que no cambian con el tema. En Board, el menú del sistema (`.cr-menu`) es oscuro, así que los titulares de las skills quedaban tinta oscura sobre fondo oscuro y solo se leían al pasar el ratón, cuando el hover ponía un papel claro debajo.

**Decisión.** Las filas (`.sys-skills__row`) usan `--text`, el hover y la fila activa del menú del fichero `--surface-2`. Son los tokens que `.cr-menu` redefine para el tema oscuro en `components/criterio/criterio.css` (`--text` pasa a papel, `--surface-2` a `--chrome-raised`), igual que `.cr-menu-item`. La cuenta de skills del botón (`.sys-skills__n`) sigue en papel y tinta: vive fuera del menú, sobre la barra del fichero.

**Por qué.** Eric, 07-10: "aquí hay que mejorar el diseño, ves que los titulares no se ven hasta hacer hovering". Interpretación: era un fallo de tokens, no de jerarquía.

**Cómo aplicarlo.** Dentro de `.cr-menu`, `.modal--window` o `.cr-window`, solo tokens semánticos: `--text`, `--text-2`, `--muted`, `--surface-2`, `--border`. Nunca `--ink`, `--paper`, `--disabled` ni colores de papel a pelo, porque esas superficies cambian de tema por sí solas. Al crear un menú nuevo, probarlo en Board antes que en Paper.
