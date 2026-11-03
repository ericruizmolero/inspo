---
title: El logotipo es Tino, el mismo dibujo que el favicon
date: 2026-11-03
status: vigente
kind: diseño
supersedes: "La criatura es el logotipo y el favicon, y nada más por ahora" (2026-10-07), en lo que quedaba del logotipo
---
**Contexto.** Con el favicon ya en Tino, la app seguía pintando la criatura verde de `Logo` (la portada sin sesión, el login, las barras de Ajustes y Admin, esta librería…). Eric lo vio el 03-11 en la barra de la portada y en `/library/marca`.

**Decisión.** `Logo` dibuja a Tino plano: `TinoMark` (`components/TinoMark.tsx`), el SVG del favicon en línea, en el color del texto (`--text`; en el cromo `--chrome-ink`), así que va en blanco en oscuro y en tinta en claro, y con el visor recortado por una máscara, de modo que se ve lo que hay detrás. Los mismos sitios y tamaños que antes. El avatar de nuestras skills en Descubrir y el icono del servidor MCP pasan a `public/app-icon-512.png`. Los iconos de la extensión de Chrome siguen siendo la criatura.

**Por qué.** Eric: "aquí hay que actualizar a tino también" y "el logotipo tiene que ser tino en blanco también como el favicon". Dejó abierto si plano o el peluche en 3D del manual ("no sé si plano o lo que tenemos aquí"): el bloque Logotipo de la librería enseña los dos a los mismos tamaños hasta que se decida.

**Cómo aplicarlo.** Donde haga falta la marca, `Logo` con su `size`; nunca `<img src="/icon.svg">`, que sigue el tema del sistema operativo y no el de la app. Si gana el 3D, que sea una imagen fija renderizada del peluche, no el motor vivo: cada `Tino` abre un contexto WebGL y carga three.js.
