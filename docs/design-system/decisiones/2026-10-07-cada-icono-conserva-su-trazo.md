---
title: Cada icono conserva su trazo, sin regla global de grosor
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** Para igualar los iconos del sistema (trazo 2 sobre 24 px) con los de área y sección (trazo 1,5 sobre 16 px) se probó una regla global de 1,5 px en pantalla para todos.

**Decisión.** La regla se quitó el mismo día. Cada icono se pinta con su propio trazo: `Icon` del sistema a 2, los de área (`components/area-icons.tsx`) y sección (`components/section-icons.tsx`) a 1,5.

**Por qué.** Alberto: "so ugly".

**Cómo aplicarlo.** No tocar `stroke-width` desde fuera del icono. Si un icono nuevo es nuestro (un concepto de Criterio), se dibuja a 1,5 sobre 16 con la misma mano que los de área; si es genérico, `Icon` o lucide tal cual.
