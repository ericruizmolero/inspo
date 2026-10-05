---
title: La cortina del sidebar se mueve en el compositor (WAAPI)
date: 2026-09-24
status: sustituida
kind: desarrollo
---
**Contexto.** La primera isla con GSAP iba a tirones y se congelaba en Safari (5-18 s de hilo bloqueado por toggle con 125 tarjetas). Se revirtió.

**Decisión.** `setSidebarOpen` mide, hace `flushSync` y lanza animaciones WAAPI de `transform` sobre columna, bloque de contenido y hasta 60 tarjetas visibles, con `cubic-bezier(0.65,0,0.35,1)` y 550 ms. El masonry pasa a ser plano (posiciones en `cqw`), así ninguna tarjeta se remonta.

**Por qué.** Eric quería "cortina orgánica, todo moviéndose en bloque y al unísono, arranque instantáneo, fluidez de Apple". Con WAAPI un hilo ocupado ya no frena la animación. Resultado: "AHORA PARECE QUE PERFECTO".

**Cómo aplicarlo.** Ver el patrón "Movimiento en bloque" en patrones.md. Medir las cajas "después" antes de crear ninguna animación; nunca `clearProps: "all"`.

**Estado (2026-10-05).** El sidebar de escritorio desapareció con el canvas (PR #56, 02-10): en escritorio navega la Isla y `Sidebar.tsx` solo se monta en móvil. La cortina ya no existe en el código. Lo que sigue valiendo es la lección: medir todo antes de animar, animar `transform` y no relayoutar por frame.
