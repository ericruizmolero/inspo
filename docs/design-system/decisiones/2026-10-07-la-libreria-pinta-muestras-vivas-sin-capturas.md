---
title: La librería pinta muestras vivas de cada pieza del sistema, sin capturas
date: 2026-10-07
status: vigente
kind: desarrollo
supersedes: las capturas de pantalla del catálogo (docs/design-system/capturas, servidas en /library/capturas) de la librería interna (2026-10-05)
---
**Contexto.** El catálogo de `/library/componentes` mezclaba muestras vivas con diez capturas de pantalla (Isla, tablero, ficha, login…) tomadas con el diseño anterior al sistema Criterio. Con el cambio de diseño quedaron viejas el mismo día, y el bloque "Sistema Criterio" del catálogo tenía doce fichas para treinta y seis componentes, con las mismas piezas descritas otra vez, a la antigua, en "Comunes".

**Decisión.** Una ficha por export de `components/criterio/index.tsx`, cada una con `muestra: nombre` y su muestra dibujada en `components/design-library/Specimens.tsx` con el componente real y el CSS de la app; las fichas viejas de la misma pieza (`Botón`, `Botón de icono`, `Campo de texto`, `Ventana modal`, `Diálogo`) se funden en la nueva y los nombres antiguos (`.btn`, `.input`, `.pill`, `components/ui/button.tsx`) quedan como chips de la ficha. Se retiran las capturas: `docs/design-system/capturas/`, la ruta `app/library/capturas/[name]`, su línea en `next.config.ts` y el token `captura:` del catálogo (`lib/design-system.ts`, `Catalog.tsx`). La página de tokens (`/library/fundamentos`) se queda solo con tokens y el cromo; los componentes viven en el catálogo. `npm run check:design-system` (`scripts/check-design-system.ts`) comprueba que cada `muestra:` tiene su dibujo y al revés, que cada export tiene ficha, que los enlaces a decisiones existen y que ninguna ficha pide capturas.

**Por qué.** Eric, 07-10: "el sistema de diseño tendremos que rehacerlo entero con este nuevo gran cambio de diseño". Interpretación nuestra: una captura envejece con cada cambio y una muestra viva no, porque es el mismo CSS que pinta la app; y una ficha por componente es lo que un agente necesita para no inventar otro.

**Cómo aplicarlo.** Una pieza nueva del sistema = su ficha en `componentes.md` con `muestra:` + su dibujo en `Specimens.tsx` + `npm run check:design-system` en verde. Nada de imágenes en el catálogo.
