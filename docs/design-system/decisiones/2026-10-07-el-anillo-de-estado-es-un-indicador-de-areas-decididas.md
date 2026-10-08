---
title: El anillo de estado es un indicador de áreas decididas
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** El anillo de un proyecto (`StatusRing`, en las pestañas de la Isla y en las tarjetas de la casa) tenía tres estados fijos: anillo moss con las ocho áreas decididas, anillo apagado antes de eso y punto ember con referencias nuevas desde la última lectura. Un sistema con 7 de 8 áreas se veía igual que uno sin empezar.

**Decisión.** `StatusRing` acepta `progress` (0 a 1) y entonces se pinta como indicador: un arco moss de `--ring-fill` grados y nada en el resto, sin pista gris (`.cr-ring-gauge`: un círculo SVG con trazo de 2 px y `stroke-dasharray`, no un `conic-gradient` con máscara, que a 12 px se veía pixelado). 0 es el anillo apagado de siempre y 1 el anillo moss cerrado; los tonos `synced` e `idle` no cambian de nombre. El punto ember (`new`) sigue mandando: con referencias sin leer no hay indicador. `useBoardStatus` (`components/ProjectChooser.tsx`) y `ringOf` (`components/Island.tsx`) pasan `áreas decididas / 8`; `BoardCard` lo reenvía con `progress`.

**Por qué.** Eric, 07-10, viendo la Isla con "Sistema 7/8" al lado de un anillo apagado: "aquí los anillos son barras de progreso... en ese caso 7/8 una verde casi rellena no?". Al verlo con pista gris: "el hueco gris no me gusta".

**Cómo aplicarlo.** Donde haya un recuento de pasos hechos sobre un total, el anillo lo enseña con su arco; no se reserva el color para el 100 %. Pendiente de decidir: cómo convive el indicador con el punto ember de "algo nuevo", que hoy lo tapa; y qué pasa con un proyecto al que una área no le aplica (sin iconografía, por ejemplo), que hoy nunca cierra el anillo aunque el MD esté completo.
