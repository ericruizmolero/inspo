---
title: El icono de la extensión es Tino solo, en blanco, sin baldosa
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Desde la 0.7.5 el icono de la extensión era Tino en tinta sobre una baldosa de papel. En la barra oscura de Chrome, Eric: "el bunny así en negro con fondo blanco me parece demasiado chulesco", "no sé si podemos ponerlo solo en blanco y ya".

**Decisión.**
- En la barra de Chrome (`action.default_icon` de `extension/chrome/manifest.json`) y en la cabecera del popup y de la página de importar (`.logo`), Tino solo, en blanco, con el ojo recortado (transparente) y sin baldosa: `icons/tino-white-16.png`, `-32` y `-48`, sacados de `app/icon.svg`.
- Con el sistema en claro, el popup cambia el de la barra por la versión en tinta (`icons/tino-ink-*`, `chrome.action.setIcon` en `popup.js`), porque el blanco desaparece en la barra clara. Hasta la primera vez que se abre el popup se ve el blanco.
- La baldosa (`icon16` a `icon128`) se queda donde el fondo es claro: la página de extensiones de Chrome, la tienda y la píldora "Importar a Criterio" (`board-button.js`).
- Extensión 0.9.1.

**Por qué.** Eric lo pidió con esas palabras. Lo de cambiar a tinta en claro es interpretación nuestra, para que el icono no desaparezca.

**Cómo aplicarlo.** Un icono nuevo de la extensión sale de `app/icon.svg` en las dos versiones, blanco y tinta, sin baldosa. Si algún día la barra puede leer el tema sin abrir el popup, se cambia ahí.
