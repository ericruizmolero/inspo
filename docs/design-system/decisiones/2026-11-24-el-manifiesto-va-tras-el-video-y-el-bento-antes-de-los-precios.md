---
title: En la portada el manifiesto va tras el vídeo, el bento antes de los precios y el antes y el después se oculta
date: 2026-11-24
status: vigente
kind: diseño
supersedes: La portada lleva el logo con el menú, el bento y las preguntas de /landing/ (2026-11-24), solo en el orden de las secciones y en que se ve el antes y el después
---
**Contexto.** Desde el 24-11 la portada llevaba, entre la ventana del producto y el manifiesto, el antes y el después ("Same brief. Two landings.") y el bento ("Every decision in one file. Always at hand.").

**Decisión.**
- Orden de `/` y `/es/`: héroe, ventana del vídeo, manifiesto (`#mf`), bento (`#archivo`), planes (`#pricing`), preguntas y cierre. En `marketing-site/video/landing/plantilla.html`, `%%BENTO%%` va entre `%%MANIFESTO%%` y `%%PRICING%%`; `%%AFTER_WINDOW%%` deja de existir.
- El antes y el después (`HomeCompare`, `#encargo`) se oculta por ahora: `construir.py` no lo pone y `SECTIONS` (`src/home-copy.ts`) no lo lista en el menú. El componente, su texto (`compare`) y sus imágenes (`public/assets/vault/ba/`) se quedan.
- El menú (oculto poco después, [decisión](2026-11-24-el-menu-de-la-web-se-oculta-por-ahora.md)) sigue el mismo orden: Cómo funciona, Por qué existe, Qué hace, Precios, Preguntas.
- El bento asoma mientras criterio.md todavía tiene la página en oscuro, así que lleva su versión oscura: titular y baldosa de búsqueda invierten tinta y papel como los planes (`--ink`, `--paper-l: #161512`), y el campo lee `--hb-well` (blanco, `#24221E` en oscuro), registrada con `@property`. Las baldosas de color (butter, ember y `#191B28`) no cambian.

**Por qué.** Alberto, 24-11: "hidde this section 'Same brief. Two landings.' for now, manifesto next to the video and move this section 'Every decision in one file. Always at hand.' after the manifesto and before the pricing". La versión oscura del bento es interpretación nuestra de [todo cambia a la vez](2026-11-23-la-portada-pasa-de-clara-a-oscura-cuando-criterio-md-llena-la-pantalla.md).

**Cómo aplicarlo.** Para volver a enseñar el antes y el después, se añade `HomeCompare` y su marca en `construir.py` y `plantilla.html`, y `encargo` a `SECTIONS` con su nombre en los dos idiomas; debajo de criterio.md necesita versión oscura.
