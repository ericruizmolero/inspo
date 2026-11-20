---
title: Los planes de la portada siguen a ?lang= y Tino se agacha cuando pasan por su esquina
date: 2026-11-20
status: vigente
kind: diseño
---
**Contexto.** Con los planes en la portada ([decisión del 20/11](2026-11-20-la-portada-lleva-los-planes-y-su-formulario-apunta-a-la-lista.md)) aparecieron dos fallos. `?lang=` cambia los textos de la página de Andoni al cargar, pero los planes y "Precios" de la cabecera se quedaban en el idioma con que se construyó la página. Y Tino, fijo en la esquina de abajo a la derecha, tapaba la tarjeta de la derecha por debajo de unos 1420 px de ancho (medido en Chrome de 375 a 1366 px).

**Decisión.**
- `HomePlans.astro` pinta los planes en todos los idiomas de `LOCALES` (`src/i18n.ts`), cada uno en su `<section lang data-locale>` y el que no es el de la página con `hidden`; `#pricing` es el `div.pricing` que los envuelve. `construir.py` escribe igual el enlace de la cabecera: un `<span data-locale>` por idioma, de `PAGES.pricing.nav`. El script de `plantilla.html`, en la línea que rellena los `data-t`, enseña el `data-locale` del idioma de `?lang=` y oculta el resto. Los precios siguen saliendo de `src/plans.ts`, y sin JavaScript se ve el idioma de la página.
- Mientras `#pricing` pasa por el sitio de su cuerpo (su caja de 132 px, o 96 px en móvil, sin el aire de los lados: `R * .8`), Tino se agacha bajo el borde de la pantalla con el mismo deslizamiento con que se va junto a la ventana, y vuelve al salir. Va en `tick`, después de `actorSide` y `actorAt`. A 1420 px o más la tarjeta no le llega y no se mueve.

**Por qué.** Alberto: "Make the pricing follow the same switch, with the prices still from plans.ts" y "Make the pricing never sit under him at any width from 375 to 1920 (keep Tino's behavior)". Las dos variantes van en el HTML porque el cambio de Andoni ocurre en el navegador, después del build, y Astro no puede pintar ahí otro idioma (interpretación nuestra). Agacharse y no apartar la sección porque en móvil las tarjetas ocupan todo el ancho: ningún margen deja sitio a Tino sin estrecharlas a la mitad (interpretación nuestra).

**Cómo aplicarlo.** Algo nuevo que llegue a la portada desde el código de la web y dependa del idioma se pinta en todos los idiomas con `data-locale`, y el script ya lo cambia (`marketing-site/video/README.md`, «Lo que la portada toma de la web»). Si se añade a la portada otra sección que llegue al borde derecho, se pasa a Tino por el mismo test de su esquina. El patrón está en [patrones](../patrones.md).
