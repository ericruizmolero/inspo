---
title: El menú de la web de marketing se oculta por ahora y el header es solo el logo
date: 2026-11-24
status: vigente
kind: diseño
supersedes: La portada lleva el logo con el menú (2026-11-24) y Toda la web de marketing lleva el header de la portada (2026-11-24), solo en que el header lleva la tecla Menú
---
**Contexto.** El header de toda la web llevaba el logo y la tecla Menú, con su panel, en un solo componente (`SiteHeader.astro`).

**Decisión.** El header es solo el logo, en la portada y en las demás páginas. El menú (tecla, panel, script y estilos) pasa a `marketing-site/src/components/SiteMenu.astro`, que nadie coloca por ahora. Privacidad, Términos y el otro idioma siguen en el cierre de la portada y en el pie de las demás.

**Por qué.** Alberto, 24-11: "hidde also the menu for now". Que sea en toda la web, y no solo en la portada, es interpretación nuestra: comparten el header.

**Cómo aplicarlo.** Para volver a enseñarlo, `SiteHeader.astro` coloca `<SiteMenu locale={locale} page={page} />` después del logo, dentro del `<header>`; en la portada, que ya no lleva header ([decisión](2026-11-24-el-logo-de-la-portada-va-dentro-del-titular.md)), lo coloca `construir.py`. Sus reglas de móvil ([decisión](2026-11-24-la-portada-en-movil-y-tablet.md)) van con él. `SECTIONS` (`src/home-copy.ts`) sigue el orden de la página aunque no se vea.
