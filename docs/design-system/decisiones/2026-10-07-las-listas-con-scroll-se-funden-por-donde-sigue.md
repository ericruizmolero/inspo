---
title: Las listas con scroll se funden por el borde donde sigue la lista
date: 2026-10-07
status: vigente
kind: diseño
---

**Contexto.** El menú de pistas del altavoz (`components/SoundControl.tsx`) enseña las estaciones y, debajo, las pistas en una lista de altura fija que hace scroll. La última fila quedaba cortada a secas por el borde del menú y nada decía que hubiera más.

**Decisión.** Clase del sistema `.cr-scroll-fade` en `components/criterio/criterio.css` (marcada "app:"): una `mask-image` con dos degradados de 28 px, `--cr-fade-top` y `--cr-fade-bottom` (propiedades registradas con `@property`), movidos por dos animaciones con `animation-timeline: scroll(self)` y `animation-range` en los primeros y últimos 28 px del recorrido. Así arriba del todo solo se funde el final, la nube de arriba aparece al empezar a bajar y la de abajo se apaga al llegar al final; una lista que no hace scroll no se funde (su línea de tiempo está inactiva y los dos valores quedan en 0). Se usa con longhands (`animation-name`, `animation-timing-function`, `animation-fill-mode`) y no con el atajo `animation`, porque el atajo reinicia `animation-range` y, pasada por el pipeline de CSS de Next, la nube de arriba salía siempre encendida. En navegadores sin líneas de tiempo de scroll (Firefox) la lista simplemente no se funde. Puesta en `.sound-tracks__list` y en `.cr-picker-list` (`components/ProjectPicker.tsx`).

**Por qué.** Eric, 07-10, con la captura del menú de pistas: "si hay scroll hay que poner nubecita", y después: "cuidado con la nube superior eh, solo tiene que aparecer cuando empiezas a hacer scroll". Interpretación: el borde fundido es la señal de que hay más, así que solo tiene sentido por donde de verdad hay más.

**Cómo aplicarlo.** Cualquier lista con `overflow: auto` dentro de un menú, un selector o un panel lleva `.cr-scroll-fade`; no se inventan degradados a mano ni se dejan filas cortadas. No vale para un menú que hace scroll entero con su borde (el `mask` recortaría el marco): ahí la lista interior es la que lleva la clase. Se comprueba con la lista arriba del todo (sin nube arriba), a medias (dos nubes) y al final (sin nube abajo).
