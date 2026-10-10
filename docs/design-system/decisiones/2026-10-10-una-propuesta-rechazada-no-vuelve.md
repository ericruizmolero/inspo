---
title: Una propuesta rechazada no vuelve, y lo dicho en un área llega a la siguiente pasada
date: 2026-10-10
status: vigente
kind: producto
---
**Contexto.** Cada área del Sistema tiene conversación, propuestas que se aceptan o se rechazan y un historial de revisiones, pero las pasadas del modelo no lo leían. Una propuesta rechazada podía volver con otras palabras, lo que alguien explicaba en un área no llegaba al modelo y, cuando el equipo reescribía una decisión del modelo, la diferencia se perdía (issue #48).

**Decisión.** `areaMemory()` (`lib/area-comments.ts`) lee por área lo dicho (`said`: las 8 últimas líneas de su conversación, sin las propuestas, y `saidOmitted`), lo rechazado (`rejected`: las 5 últimas propuestas con estado rechazada, con quién dijo que no) y lo reescrito (`rewritten`: las 2 últimas veces que una revisión del equipo siguió a una del modelo con otro texto). La pasada del Sistema (también "Mejorar con IA", que es la misma con `focus`), las opciones y la curación lo reciben, con una regla común (`MEMORY` en `lib/system.ts`). Un área sin nada no lleva clave, así que un proyecto sin conversación lee lo mismo que antes. Un rechazo bloquea para siempre: no depende de que cambie el tablero; solo el equipo lo trae de vuelta decidiéndolo. No hay campo de motivo del rechazo: el motivo, si se da, vive en la conversación.

**Por qué.** Que el equipo diga no una vez y no tenga que repetirlo. Un rechazo que caduca con la evidencia obliga a vigilar cada pasada; uno que solo el equipo levanta deja la decisión donde está.

**Cómo aplicarlo.** Toda pasada nueva que decida un área carga `areaMemory()` y lleva `MEMORY` en su prompt. El caso de las evals vive en el área de color de `scripts/fixtures/system/zernio.json`; `npm run eval:system` cuenta `rejected back` (tiene que ser 0) y `said cited`.
