---
title: Los títulos van en Geist Serif
date: 2026-11-04
status: vigente
kind: diseño
supersedes: Geist es la única familia (2026-11-03)
---
**Contexto.** Desde el 03-11 Geist era la única familia de la app ([decisión](2026-11-03-geist-es-la-unica-familia.md)). Los títulos ya tenían su propio token, `--font-title`, que apuntaba a Geist, para que una segunda familia fuera una sola línea.

**Decisión.**
- `--font-title` pasa a Geist Serif (`var(--font-geist-serif)`, con respaldo Georgia), cargada en `app/fonts.ts` como `geistSerif` desde `app/fonts/geist-serif/GeistSerif-Regular.woff2`, con su `OFL.txt`.
- Afecta a los cuatro pasos de título (display, title-l, title-m, title-s) y a `h1` a `h6`. El resto sigue en Geist.
- Geist Serif tiene un solo peso, así que `--fw-display`, `--fw-title-l`, `--fw-title-m` y `--fw-title-s` pasan a 400, y los títulos llevan `font-synthesis-weight: none`.

**Por qué.** Eric: "cambias las typos de heading a [la serif de vercel.com/font] esta sí", "tiene que ser la serif". Interpretación mía: la serif de alto contraste da carácter a los titulares sin tocar la lectura de la interfaz, que sigue en Geist.

**Cómo aplicarlo.** Un título nuevo usa `--font-title` o una clase `.t-*` de título, nunca una familia escrita a mano. No se pone negrita a un título: Geist Serif no la tiene.
