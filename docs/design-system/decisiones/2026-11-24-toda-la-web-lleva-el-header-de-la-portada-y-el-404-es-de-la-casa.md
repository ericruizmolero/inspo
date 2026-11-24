---
title: Toda la web de marketing lleva el header y el papel de la portada, sin Entrar, y la página 404 es de la casa
date: 2026-11-24
status: vigente
kind: diseño
---
**Contexto.** Las legales, Recursos, Skills y la extensión tenían otro header (icono, idioma y la tecla Log in), otro fondo (`#FCFAF6`) y un pie con línea. La 404 era un título suelto, solo en inglés.

**Decisión.**
- `SiteHeader.astro` (antes `HomeHeader`) es el header de toda la web. En la portada la tecla se queda fija y el menú lleva el vídeo; en las demás el header se va con el scroll y las secciones son las de la portada (`/#pricing`). Sin Entrar hasta que se abra el registro. `Header.astro` y `Home.astro`, que ya no usaba nadie, se borran.
- `Base.astro` pasa al papel de la portada (`--page`, `#E7E5DF`) y da los nombres que usa el header (`--r`, `--rb`, `--out`, `--display`…).
- `Footer.astro`: Privacidad, Términos y la página en el otro idioma, centrados y sin línea, como el cierre.
- Legales (`LegalPage.astro`): título de hasta 66 px, entradilla en tinta a 20 px y texto a 17 px sobre 728 px.
- 404 (`src/pages/404.astro`): "Nothing here. / Not even AI slop." y "Aquí no hay nada. / Ni AI slop.", con la tecla de volver y Tino dormido abajo, que se despierta al acercarte. Sirve los dos idiomas: el script enseña el de la dirección (`/es/…`). El 3D espera a que la página esté quieta; sin WebGL no sale.

**Por qué.** Alberto, 24-11: "make not found design to fit with the landing page, remove login from privacy and terms and adapt the design (header and general style for these pages)". Los textos de la 404 son interpretación nuestra.

**Cómo aplicarlo.** Una página nueva usa `Base`, `SiteHeader` con su `page` y `Footer`. Nada vuelve a poner un botón de entrar mientras haya lista de espera.
