---
title: La criatura es el logotipo y el favicon, y nada más por ahora
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** El sistema trae una criatura de tres ojos como personaje (Creature, Profile, Sprite, la o con ojos del wordmark). Al adoptar el sistema se dejó fuera entera: el logotipo era texto.

**Decisión.** La criatura entra como logotipo: su dibujo en 3D (verde, antenas naranjas, tres ojos) es `Logo` (`components/Logo.tsx`) en toda la app (`public/logo.png` a 192, `public/icon-512.png` por encima de 96 px), el favicon (`app/favicon.ico`, `app/icon.png`), el icono de Apple (`app/apple-icon.png`, sobre papel porque iOS rellena la transparencia de negro) y los iconos de la extensión (versión 0.5.2). Sin baldosa ni radio propios: es un dibujo transparente. El resto de la criatura (estados, Sprite, la o del wordmark) sigue fuera; `Balloon`, `TipWindow` y `EmptyState` van sin dibujo.

**Por qué.** Alberto pasó el dibujo para "logo for all the ui and favicon". Interpretación nuestra: el resto del personaje se queda fuera hasta que esté listo para vivir en el producto.

**Cómo aplicarlo.** Donde haga falta la marca, `Logo` con su `size`. No dibujar la criatura en otros sitios ni hacerle estados sin decisión nueva.
