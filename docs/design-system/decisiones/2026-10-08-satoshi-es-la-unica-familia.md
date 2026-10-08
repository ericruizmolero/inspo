---
title: Satoshi es la única familia
date: 2026-10-08
status: vigente
kind: diseño
supersedes: Atkinson Hyperlegible Next para el texto y Archivo para los títulos (2026-10-08)
---
**Contexto.** El mismo día se probaron Archivo para todo, Archivo ensanchado para títulos, y seis fuentes de texto bajo títulos en Archivo (`design-explorations/body-font.html`). Se eligió la F (Source Sans 3) y luego la E (Atkinson Hyperlegible Next). Después Alberto pidió probar Satoshi como única familia (variante G).

**Decisión.** Satoshi para títulos, texto e interfaz. `--font-sans` en `app/globals.css` apunta a Satoshi y `--font-title` apunta a `--font-sans`, así que una segunda familia sería una sola línea. Se carga con `next/font/local` en `app/fonts.ts` desde `app/fonts/satoshi/`. Los ficheros **no están en git**: `scripts/fetch-fonts.mjs` (`npm run fonts`, y antes de `dev` y `build`) descarga de Fontshare las variables normal e itálica, las dos TTF estáticas que usa la imagen OG y la variable de la extensión. La escala, los pesos `--fw-*` y los tokens no cambian. Se retiran Archivo y Atkinson de la app y de la extensión.

**Por qué.** Alberto: "try satoshi as only one then" y "let's stay with satoshi". Los ficheros quedan fuera de git porque la licencia de Satoshi (ITF Free Font License 2.0) permite alojarla en nuestra web y meterla en nuestras apps, pero prohíbe compartirla en un repositorio público, y este lo es. Alberto eligió descargarla al construir en lugar del CDN de Fontshare o de hacer privado el repo. Interpretación mía: la licencia también prohíbe recortarla o convertirla, y ofrecerla como fuente elegible a terceros en un SaaS.

**Cómo aplicarlo.** No subas nunca un fichero de Satoshi al repo; si hace falta otro estilo, añádelo a `scripts/fetch-fonts.mjs`. No ofrezcas Satoshi como fuente elegible a los usuarios (marca, DESIGN.md, plantillas). Un título usa un paso `.t-*` de título; cualquier otro texto hereda `--font-sans` y no pone familia. Nada por encima de 700.
