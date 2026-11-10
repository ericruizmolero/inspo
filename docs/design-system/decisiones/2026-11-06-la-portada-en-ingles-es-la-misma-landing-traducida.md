---
title: La portada en inglés es la misma landing, traducida
date: 2026-11-06
status: sustituida
kind: diseño
---
**Contexto.** Tras publicar la landing nueva en `/es/` (página estática), `/` seguía siendo la home antigua de Astro (`Home`), con otro diseño.

**Decisión.** `/` sirve `marketing-site/public/index.html`: la misma landing de `/es/`, con todo el texto en inglés (HTML, frases de Tino, el criterio.md de ejemplo, preguntas, formulario y avisos) y los enlaces a las páginas en inglés. Usa los ficheros de `public/es/assets/` (no se duplican). Se borra `src/pages/index.astro`. Los nombres del producto siguen la app en inglés: Board, Polish, System, Inbox, Keep, Forget. El vídeo y la imagen para compartir siguen en castellano. La marca de cabecera y pie es Tino en píxeles con el grosor que tenía en blanco (el contorno metido en el dibujo), igual en negro y en blanco.

Quien entra en `/` desde España (país de la IP, `cf.country`) o con el navegador en castellano como primer idioma va a `/es/` (302, con la query). `?lang=en` deja ver el inglés. Solo la portada; el resto de páginas no redirige (`marketing-site/worker/index.ts`).

**Por qué.** Eric: "la de inglés es la misma pero traducida"; "si la IP del usuario es España que salga en castellano aunque entre a criterio.design", "o de cómo tengas el navegador".

**Cómo aplicarlo.** Un cambio en la landing de `/es/` se repite en `public/index.html`; la traducción se hizo con un script de sustituciones sobre el HTML de `/es/` y las rutas pasan de `assets/` a `es/assets/`.
