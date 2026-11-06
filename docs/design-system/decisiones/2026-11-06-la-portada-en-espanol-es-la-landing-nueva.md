---
title: La portada en español es la landing nueva, como página estática
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** La landing nueva de Criterio (cinta de referencias en WebGL, Tino guiando, manifiesto escrito con el scroll) se hizo fuera del repo, en un único `index.html` iterado por rondas con Andoni. `/es/` era `src/pages/es/index.astro` con `Home`.

**Decisión.** `/es/` sirve `marketing-site/public/es/index.html` con sus ficheros en `public/es/assets/` (fuentes, three.js, referencias, vídeo, Tino). Se borra `src/pages/es/index.astro`. `/` (inglés) y el resto de páginas no cambian. El paquete sale de `docs/empaquetar-landing.cjs` en la carpeta de la landing, no se edita a mano aquí.
- El formulario lleva a `https://app.criterio.design/login` mientras no exista `POST /api/waitlist` (#119); su URL va en `WAITLIST_URL`.
- Metadatos propios: canonical `https://criterio.design/es/`, los tres `hreflang` y su imagen para compartir. `check:dist` pasa.

**Por qué.** Andoni: «intenta publicar y subir a github todo a ver que pasa». La página aprobada por rondas se publica tal cual, sin reescribirla en Astro.

**Cómo aplicarlo.** Para cambiar la landing: editarla en su carpeta, volver a empaquetar y copiar `publicar/es/` sobre `marketing-site/public/es/`. Si algún día pasa a Astro, retirar esta decisión.
