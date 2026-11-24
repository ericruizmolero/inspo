---
title: Cada portada va solo en su idioma, la web se describe a los buscadores y todo entra por https
date: 2026-11-24
status: vigente
kind: desarrollo
supersedes: Los planes de la portada siguen ?lang= y Tino se agacha cuando pasan por su esquina (2026-11-20), solo en lo de ?lang=
---
**Contexto.** Revisión técnica de SEO. `http://criterio.design` respondía 200 sin pasar a https; el HTML de cada portada llevaba los planes, las preguntas y el manifiesto en los dos idiomas; no había datos estructurados; las páginas secundarias se compartían sin imagen; y nada estático se guardaba en caché.

**Decisión.**
- El Worker lleva `http` a `https` (301). Solo detrás de Cloudflare (`cf-ray`), para que `wrangler dev` no salga de local.
- Los componentes de la portada pintan solo el idioma de su página. `?lang=` ya no cambia textos: lleva a la otra portada.
- `HomeSchema.astro`: Organization, WebSite, SoftwareApplication con los cuatro planes y FAQPage, en JSON-LD y solo con lo que la página enseña. Sin valoraciones.
- `Base.astro` pone imagen de compartir, `twitter:card` y `og:site_name` en todas las páginas. La descripción de la extensión cabe en el buscador.
- `public/_headers`: fuentes un año, imágenes y 3D un día, más `nosniff` y `Referrer-Policy`.
- El comparador sirve 1040 px a las pantallas pequeñas. El gris de los titulares (`--h-2`) pasa a `#7F7B71`: daba 2,8:1.
- `og-home-{en,es}.jpg`, hechas desde la portada de ahora, centrada y con el logo.

**Por qué.** Alberto, 24-11: "update the landing og and do a review with seo-audit of the technical parts". Arreglar lo de bajo riesgo es interpretación nuestra.

**Cómo aplicarlo.** Un texto nuevo de la portada sale solo en su idioma. Lo que diga `HomeSchema` tiene que verse en la página.
