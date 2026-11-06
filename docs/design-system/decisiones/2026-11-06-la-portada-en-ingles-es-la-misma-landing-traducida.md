---
title: La portada en inglés es la misma landing, traducida
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Tras publicar la landing nueva en `/es/` (página estática), `/` seguía siendo la home antigua de Astro (`Home`), con otro diseño.

**Decisión.** `/` sirve `marketing-site/public/index.html`: la misma landing de `/es/`, con todo el texto en inglés (HTML, frases de Tino, el criterio.md de ejemplo, preguntas, formulario y avisos) y los enlaces a las páginas en inglés. Usa los ficheros de `public/es/assets/` (no se duplican). Se borra `src/pages/index.astro`. Los nombres del producto siguen la app en inglés: Board, Polish, System, Inbox, Keep, Forget. El vídeo y la imagen para compartir siguen en castellano. La marca de cabecera y pie es Tino en píxeles con el grosor que tenía en blanco (el contorno metido en el dibujo), igual en negro y en blanco.

**Por qué.** Eric: "la de inglés es la misma pero traducida".

**Cómo aplicarlo.** Un cambio en la landing de `/es/` se repite en `public/index.html`; la traducción se hizo con un script de sustituciones sobre el HTML de `/es/` y las rutas pasan de `assets/` a `es/assets/`.
