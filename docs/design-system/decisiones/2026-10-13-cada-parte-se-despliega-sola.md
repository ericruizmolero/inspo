---
title: Cada parte del repo se despliega sola: la app solo cuando cambia lo que sirve, la web solo con su carpeta
date: 2026-10-13
status: vigente
kind: desarrollo
---
**Contexto.** Un push a `main` construía y publicaba la app en Vercel y la web de marketing en Cloudflare, tocara lo que tocara. Con las skills dentro del repo (ver [las skills viven en este repo](2026-10-13-las-skills-viven-en-skills-de-este-repo.md)), cambiar un SKILL.md o una página de la web volvía a desplegar la app entera, con su migración y sus funciones, sin que nada de la app hubiera cambiado.

**Decisión.** La app se despliega solo si cambió algo que sirve. `vercel.json` lleva `"ignoreCommand": "bash scripts/vercel-ignore.sh"`: el script compara el último despliegue de producción (`VERCEL_GIT_PREVIOUS_SHA`) con HEAD y sale 0 (Vercel salta el build) cuando solo cambiaron `marketing-site/`, `extension/` o `skills/`; sale 1 (construye) en cualquier otro caso, y también cuando cambian `marketing-site/src/skills.ts` o `marketing-site/src/resources.ts`, que `lib/agent-skills.ts` y `lib/resources.ts` importan para Descubrir, cuando es un redeploy del mismo commit, o cuando no tiene con qué comparar (Vercel clona diez commits; si el último despliegue queda más atrás, compara con `HEAD^`). `docs/design-system/` sigue desplegando la app porque `/library` lo sirve. La web de marketing se publica solo con sus Build watch paths en el panel de Cloudflare (el proyecto `criterio-marketing`, Settings, Build): incluir `marketing-site/*`, `package.json` y `package-lock.json`; eso no vive en el repo. La extensión se sube a mano a la Chrome Web Store y no cambia.

**Por qué.** Alberto, 13-10: "we need to separate the deploys (i don't want to deploy everything always)". Interpretación nuestra: separar por rutas, no por disparo manual; un push sigue siendo la forma de publicar, pero solo despierta a la parte que cambió. El script en vez de una lista de rutas en el panel de Vercel: queda en el repo, se prueba en local y dice en el log por qué saltó o construyó.

**Cómo aplicarlo.** Una carpeta nueva que no sirva la app se añade a los `:!` del script; un fichero de fuera de la app que la app importe se añade a la segunda comparación. Probar el script antes de subirlo: `VERCEL_GIT_PREVIOUS_SHA=<sha> bash scripts/vercel-ignore.sh; echo $?`, con 0 para saltar y 1 para construir. Si un push que debía desplegar la app no lo hizo, el log del deploy en Vercel enseña la línea del script.
