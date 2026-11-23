---
title: Hasta el lanzamiento, la portada no lleva cabecera, ni Precios ni Entrar ni el Tino en píxeles
date: 2026-11-23
status: vigente
kind: producto
supersedes: Sin sesión, app.criterio.design es el login, y la portada de criterio.design lleva Entrar (2026-11-22), solo en lo de la cabecera
---
**Contexto.** Desde el 22/11 la cabecera de la portada (`/`, `/es/`) llevaba "Precios" y "Entrar" a la derecha, y a la izquierda el logo, el Tino negro en píxeles que se montaba sobre el titular. Mientras dure la lista de espera nadie nuevo puede entrar: lo único que se hace en la portada es dejar el correo.

**Decisión.**
- Fuera `.top-nav` (Precios y Entrar) de `marketing-site/video/landing/plantilla.html` y de las páginas que genera (`src/pages/index.astro`, `src/pages/es/index.astro`). `construir.py` ya no tiene las marcas `%%PRICING_NAV%%` ni `%%LOGIN_NAV%%`.
- El logo de la cabecera (`a.mark#mark`) queda con `hidden`: no se ve, pero se queda en la página porque el script lee de sus trazos (`#ear-l`, `#ear-r`, `#body`) el dibujo de Tino del favicon y de otros sitios.
- Lo demás de la decisión del 22/11 sigue: `app.criterio.design` sin sesión es el login, y su Volver lleva a la portada.

**Por qué.** Eric: "quitamos lo de precios y entrar porque entrar cuando hagamos lanzamiento ahora la gente no podrá entrar solo dejar su email se lista de espera sabes?" y, del logo, "quitamos a tino de ahi el negro". Interpretación nuestra: Precios sobra arriba porque los planes ya están en la página, entre criterio.md y el pie.

**Cómo aplicarlo.** Hasta el lanzamiento, la portada no ofrece entrar: quien ya tiene cuenta va a `app.criterio.design`. Cuando lancemos, la cabecera vuelve con Entrar (está en git, en la plantilla del 22/11) y se decide de nuevo si lleva logo. La ruta está en [mapa](../mapa.md) y el patrón, en [patrones](../patrones.md).
