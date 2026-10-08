---
title: Archivo es la única familia y la escala se reajusta
date: 2026-10-08
status: vigente
kind: diseño
supersedes: Bricolage Grotesque para titulares (sistema de diseño Criterio, 2026-10-07)
---
*La parte de las familias se sustituyó el mismo día: tras probar Source Sans 3 y Atkinson Hyperlegible Next para el texto, Satoshi es la única familia. La escala, los pesos y los tokens siguen vigentes.* → [decisión](2026-10-08-satoshi-es-la-unica-familia.md)

**Contexto.** El sistema usaba dos familias: Archivo para texto e interfaz y Bricolage Grotesque 700/800 para títulos. La escala tenía dos fallos: title-s (16) quedaba por debajo de body (17), así que un título se leía más pequeño que el texto de debajo, y en móvil display bajaba a 28 y empataba con title-l, con lo que `h1` y `h2` eran del mismo tamaño.

**Decisión.** Archivo para todo, también títulos. Se borran `Bricolage_Grotesque` de `app/fonts.ts`, el token `--font-display` de `app/globals.css` y de `extension/chrome/popup.css`, y el `.woff2` de la extensión. Nueva escala de títulos: display 40 (32 en móvil) / 700 / 1,05 / −0,025 em, title-l 28 / 700 / 1,1 / −0,02 em, title-m 22 / 600 / 1,2 / −0,01 em, title-s 18 / 600 / 1,3. Body pasa a interlineado 1,55. Toda la tipografía queda en variables: cuatro pesos (`--fw-regular`, `--fw-medium`, `--fw-semibold`, `--fw-bold`), un peso por paso (`--fw-display` … `--fw-label`), `--lh-code` para los bloques en mono y `--tr-glyph` para letras dibujadas en grande. Ningún CSS de la app ni de la extensión pone ya un peso, tamaño, interlineado o tracking en número, salvo el tamaño del wordmark de la extensión y los `em` relativos de la vista Pulir. El botón grande (`.btn--lg`, `.cr-btn-l`) pasa de title-s a body. La imagen OG pinta el título en Archivo 700.

**Por qué.** Alberto pidió "simplify typography selection to use archivo everywhere and improve sizing" y, a mitad del trabajo, "centralize the typography in variables". Lo demás es criterio mío: Archivo a 800 se ennegrece y cierra los huecos, así que los títulos paran en 700; con una sola familia, la jerarquía tiene que salir del tamaño y el peso, y cada paso de título debe quedar claramente por encima del siguiente.

**Cómo aplicarlo.** Ninguna regla de CSS pone `font-family` salvo `--font-sans` o `--font-mono`, ni un peso en número. Un título nuevo elige un paso `.t-*` o usa los tokens `--fs-*`, `--fw-*`, `--lh-*` y `--tr-*`; nunca 800. Si vuelve una segunda familia, es una decisión nueva.
