---
title: Lo nuevo de la portada se mueve solo con transform, opacity y clip-path, y se para fuera de pantalla
date: 2026-11-24
status: vigente
kind: desarrollo
---
**Contexto.** Revisión de las animaciones de los componentes nuevos de la portada con la skill animate. El menú animaba `width` y `height` con rebote en 0,42 s; la costura del comparador movía `left` desde una variable del padre; el bento animaba `filter` y seguía en bucle fuera de pantalla.

**Decisión.**
- Menú (`SiteHeader`): la tecla no cambia de tamaño; el panel está a su medida y se destapa desde la caja de la tecla con `clip-path`, 280 ms al abrir y 180 al cerrar con `--out`. Es una transición: otra pulsación la gira desde donde está.
- Comparador: `clip-path` y `transform` puestos en su elemento. Sin suavizado: sigue al dedo.
- Bento: fuera `filter`; sus bucles se paran fuera de pantalla (`.hb-off`).
- Manifiesto: cada palabra cambia su `opacity` solo cuando cambia; fuera la escala de las pastillas y el bucle del cursor.
- Todos los `:hover` que mueven algo, dentro de `@media (hover: hover) and (pointer: fine)`. Con movimiento reducido el menú se funde en 150 ms, el manifiesto sale encendido y los bucles no corren.
- Lo que se queda como estaba: la tecla se hunde a saltos (`steps(2)`), que es su gesto, y Tino va con suavizado exponencial.

**Por qué.** Alberto, 24-11: "review animations with /animate".

**Cómo aplicarlo.** Nada anima `width`, `height`, `left` ni `filter`. Un bucle decorativo lleva su `IntersectionObserver`.
