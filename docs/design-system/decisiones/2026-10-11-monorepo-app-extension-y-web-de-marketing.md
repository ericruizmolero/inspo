---
title: Un monorepo con la app, la extensión y la web de marketing
date: 2026-10-11
status: vigente
kind: desarrollo
---
**Contexto.** La app (Next.js, Vercel) y la extensión de Chrome ya vivían en el mismo repo, pero la extensión era una carpeta suelta. Hacía falta una web de marketing en `criterio.design`, en Astro y en Cloudflare, con un botón de entrada a la app (`app.criterio.design`).

**Decisión.** Workspaces de npm. La app se queda en la raíz (no se mueve nada, así que Vercel y `.vercel` siguen igual); `extension/` (`@criterio/extension`) y `marketing-site/` (`@criterio/marketing-site`) son workspaces con su `package.json`. Un solo `package-lock.json`. La web es Astro con salida estática, sin adaptador: `wrangler.jsonc` sirve `dist/` como assets de Cloudflare. La web va en inglés en `/` y en castellano en `/es/` (textos en `marketing-site/src/i18n.ts`, el cuerpo es el de la portada de invitado de la app), con un enlace de idioma en la cabecera; el botón de entrada va a `/login` y, en castellano, con `?lang=es`. El botón ("Log in" / "Entrar") es el primario ember de `botones.md`, tamaño m, y apunta a `https://app.criterio.design/login`. Satoshi se descarga en cada build con `marketing-site/scripts/fetch-fonts.mjs` (por su licencia no entra en git) y el script resuelve las rutas desde su propio fichero, para que corra igual desde la raíz o desde `marketing-site/`. ESLint y `tsc` de la raíz excluyen `marketing-site/`, que lleva su `astro check`.

Desplegada el 2026-10-11 con `wrangler deploy` en https://criterio-marketing.albertogallego.workers.dev (cuenta de Cloudflare de Alberto). El dominio `criterio.design` sigue con el DNS en Namecheap: para servirlo desde el Worker hay que pasar el DNS a Cloudflare.

**Por qué.** Interpretación mía: mover la app a `apps/` obligaría a cambiar el Root Directory de Vercel a mano y a tocar `next.config.ts`, el CI, los scripts y la documentación, sin ganar nada ahora. Con la app en la raíz, Cloudflare y Chrome Web Store son lo único nuevo.

**Cómo aplicarlo.** `npm run dev:marketing`, `npm run build:marketing`, `npm run build:extension` (el zip sale en `extension/dist/`). En Cloudflare (Workers Builds), Root directory `marketing-site`, build `npm run build`, deploy `npx wrangler deploy`. La web usa los mismos tokens que la app, solo en tema Paper; si un token cambia en `app/globals.css`, se cambia también en `marketing-site/src/layouts/Base.astro`. Un componente o patrón que la web comparta con la app se decide aquí antes de copiarlo.
