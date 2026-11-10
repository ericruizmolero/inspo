---
title: El inglés es la base y nadie va a /es/ sin pedirlo
date: 2026-11-10
status: vigente
kind: producto
supersedes: 2026-11-06-la-portada-en-ingles-es-la-misma-landing-traducida.md
---
**Contexto.** La landing nació en castellano en `/es/` y la inglesa en `/` usaba sus ficheros (`public/es/assets/`). Al pasar ambas a Astro (`src/pages/index.astro` y `src/pages/es/index.astro`), la castellana cargaba los ficheros con rutas relativas (`assets/...`): en `/es` sin barra final pedía `/assets/...` y todo daba 404 (fuentes, Tino, fotos del equipo, referencias). El Worker además mandaba a `/es/` a quien entraba en `/` desde España o con el navegador en castellano.

**Decisión.** Los ficheros de la landing viven en la raíz: `marketing-site/public/assets/`, `public/og.jpg`, `public/apple-touch-icon.png` y `public/tino-*.png` (antes bajo `public/es/`). Las dos páginas los piden con ruta absoluta (`/assets/...`, `/tino-dock.png`, `https://criterio.design/og.jpg`), así que cargan igual en `/es` y en `/es/`. `marketing-site/worker/index.ts` ya no redirige por país ni por idioma del navegador: `/` es inglés para todos y `/es/` solo para quien lo abre. Lo demás de la decisión del 06-11 sigue: misma landing traducida, nombres del producto en inglés.

**Por qué.** Alberto: "/es is not loading the assets, also make english the default in everything". Sustituye la redirección que pidió Eric ("si la IP del usuario es España que salga en castellano"). Interpretación mía: "in everything" incluye la redirección y la carpeta base de los ficheros.

**Cómo aplicarlo.** Un fichero nuevo de la landing va en `public/assets/` y se pide con `/assets/...`, nunca con ruta relativa. Un cambio en una landing se repite en la otra. La app (`/` sin sesión) sigue eligiendo `/` o `/es/` por su propio idioma; eso no cambia aquí.
