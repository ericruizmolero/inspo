---
title: La miniatura de Descubrir sigue al ratón sin GSAP
date: 2026-10-05
status: vigente
kind: desarrollo
---
**Contexto.** Eric pidió que, al pasar el ratón por la lista de Recursos de Descubrir, saliera una miniatura pequeña del hero de cada web, con una animación suave, y la pidió con GSAP. Ese mismo día se quitó GSAP de main y se dejó escrito que no se vuelve a añadir sin una decisión. La primera versión de la miniatura y el placeholder rotativo del selector de proyectos usaban GSAP.

**Decisión.** Se hacen sin GSAP. La miniatura (`.disc-peek`, `usePeek` en `components/Discover.tsx`) es una sola para toda la lista y va portada al `body`. Se coloca con `translate`, que se suaviza en cada fotograma con `requestAnimationFrame` (`PEEK_TRAIL`). Entra y sale con WAAPI (opacidad y `scale`), siempre desde donde estaba. Al cambiar de fila, la imagen hace un pequeño zoom de 1.08 a 1. Solo aparece con el ratón y, con reduced-motion, se coloca junto al puntero y solo se funde. El placeholder rotativo de `ProjectChooser.tsx` (`Examples`) pasa también a WAAPI, con el mismo escalonado por palabra.

**Por qué.** A la pregunta de si se volvía a añadir GSAP o se hacía igual sin él, Eric contestó: "Sin GSAP, mismo efecto". Interpretación: lo que importa es el efecto, no la librería.

**Cómo aplicarlo.** Para seguir al puntero se usa `requestAnimationFrame` con suavizado; para entradas y salidas, WAAPI con las curvas de los tokens. Que alguien pida GSAP por su nombre no basta para volver a añadirlo: hay que preguntar.
