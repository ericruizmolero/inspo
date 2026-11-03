---
title: El favicon es Tino, el mismo de la landing
date: 2026-11-03
status: vigente
kind: diseño
supersedes: la parte del favicon de "La criatura es el logotipo y el favicon, y nada más por ahora" (2026-10-07)
---
**Contexto.** El favicon y los iconos de la app eran la criatura 3D del logotipo. Tino ya vive en el Inicio, la búsqueda y el Sistema, y la landing (criterio-landing.vercel.app) lleva ya su favicon de Tino: `marca/conejo-icono.svg`. Primero se probó el icono de app de la hoja "Cyberbunny" (Tino asomando en una baldosa de tinta) y se descartó.

**Decisión.** El favicon es ese mismo SVG, copiado tal cual en `app/icon.svg`: Tino de perfil, orejas cortas, cuerpo redondo y visor de una raya, sin baldosa; en tinta `#1B1B18` con el visor en papel, y con `prefers-color-scheme: dark` el propio SVG pasa a papel `#EDE6D6` con el visor `#141412`. Los PNG no pueden seguir al tema y van en la versión clara: `app/favicon.ico` (16, 32, 48 y 64) e `app/icon.png` (256), transparentes; `app/apple-icon.png` (180) y `public/app-icon-512.png` (el de `app/manifest.ts`) sobre papel `#EDE6D6`, porque iOS rellena la transparencia de negro. La criatura sigue siendo `Logo` en la interfaz (`public/logo.png`, `public/icon-512.png`); los iconos de la extensión de Chrome no cambian todavía.

**Por qué.** Eric: "hazlo como está en ese favicon", señalando la página de la mascota de la landing. Que la app y la landing lleven el mismo icono es interpretación nuestra del motivo.

**Cómo aplicarlo.** El favicon de la app es el de la landing: si allí cambia `conejo-icono.svg`, aquí se copia y se regeneran los PNG a la vez. Un icono nuevo (extensión, tiendas) sale de ese mismo dibujo.
