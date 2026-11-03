---
title: Geist es la única familia
date: 2026-11-03
status: vigente
kind: diseño
supersedes: Satoshi es la única familia (2026-10-08)
---
**Contexto.** Desde el 8 de octubre Satoshi era la única familia de la app, la imagen OG, la extensión y la web de marketing. Su licencia obligaba a dejar los ficheros fuera de git y a descargarlos de Fontshare antes de cada `dev` y `build`.

**Decisión.** Geist (Vercel) para títulos, texto e interfaz en los cuatro sitios. `app/fonts.ts` exporta `geist` con `next/font/local` desde `app/fonts/geist/` (variables normal e itálica, peso 100 a 900) y crea `--font-geist`; `--font-sans` y `--font-title` en `app/globals.css` apuntan a ella. La imagen OG usa `Geist-Regular.ttf` y `Geist-Bold.ttf` de la misma carpeta. La extensión lleva `extension/chrome/fonts/Geist-Variable.woff2` y la web `marketing-site/public/fonts/Geist-Variable.woff2`. Los ficheros **están en git**, cada carpeta con su `OFL.txt`. Se borran `scripts/fetch-fonts.mjs`, `marketing-site/scripts/fetch-fonts.mjs`, los scripts `fonts`, `predev` y `prebuild`, y las líneas de `.gitignore`. La escala, los pesos `--fw-*` y los tokens no cambian.

**Por qué.** Alberto: "change the font for the geist". Interpretación mía: Geist va bajo la SIL Open Font License 1.1, que deja guardarla en un repositorio público, así que sobra el paso de descarga.

**Cómo aplicarlo.** Un estilo nuevo de Geist se copia del paquete `geist` de npm a la carpeta que lo use, junto a su `OFL.txt`. Un título usa un paso `.t-*` de título; cualquier otro texto hereda `--font-sans` y no pone familia. Nada por encima de 700.
