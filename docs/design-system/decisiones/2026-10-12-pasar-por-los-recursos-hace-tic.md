---
title: Pasar el ratón por los recursos de Descubrir hace tic
date: 2026-10-12
status: vigente
kind: diseño
---
**Contexto.** En Descubrir, la lista de recursos enseña una miniatura de la web que sigue al puntero, pero recorrerla era mudo. El tornado de Pulido ya marca con `tap` cada carta que pasa cuando lo gira la persona.

**Decisión.** Entrar con el ratón en una fila de recursos (`.disc-row`, `rowTick` en `components/Discover.tsx`) suena `tap` sutil por `cue`, con un mínimo de 70 ms entre dos (`TICK_MS`), como la muesca del tornado. Se probó `type` (una tecla) el mismo día y Eric volvió a `tap`: "mejor el anterior". Solo con ratón (`pointerType === "mouse"`): un toque en el móvil no suena. Con los sonidos apagados no suena nada. Eric: "haz que el hovering de la lista de recursos tenga sonido".

**Por qué.** Lo pidió Eric. Interpretación: recorrer la lista es un movimiento que conduce la mano, como girar el tornado, y el tic le da tacto sin ser una decisión.

**Cómo aplicarlo.** Una lista que se recorre con el puntero puede marcar cada fila con `tap` sutil y su mínimo entre ticks; nunca con un sonido más fuerte ni en táctil. Las skills de Descubrir siguen mudas mientras nadie lo pida.
