---
title: La primera pasada del Sistema de una cuenta no cuenta como acción de IA
date: 2026-10-11
status: vigente
kind: producto
---
**Contexto.** Con los precios de #89 el plan Gratis tiene 30 acciones de IA al mes. El primer uso no puede gastar parte de esa cuota en enseñar lo que hace el producto: la primera pasada del Sistema es la que convierte un tablón en el primer criterio.md (#103).

**Decisión.**
- La primera pasada del Sistema que una cuenta de facturación pide a mano ("Mejorar con IA", o la pasada que lanza el proyecto) se apunta en `ai_usage` con `ref` `first:project:<id>` (`FIRST_REF` y `systemPassRef` en `lib/usage-core.ts`). Se guarda con su coste, como todas.
- `countAi` (`lib/quota.ts`) deja fuera las filas `first:` igual que las `auto:`. Es la primera si la cuenta no tiene ninguna fila `system` sin `auto:` desde siempre (`hadSystemPass`), no solo este mes.
- La pasada de marca encadenada a esa primera sigue siendo automática: `brandChain` lee `project:<id>` y `first:project:<id>`. Las relecturas automáticas no cambian.
- `assertQuota` sigue delante: con la cuota agotada la primera pasada también se para, como las automáticas.
- En la tarjeta del plan Gratis: "Tu primer criterio.md no gasta acciones de IA".

**Por qué.** Lo decidió el lead del #103: la primera pasada guiada no cuenta. Que dos primeras pasadas a la vez en dos proyectos de la misma cuenta salgan gratis las dos es interpretación nuestra: se acepta, porque cerrarlo pediría bloquear la cuenta en cada pasada y el coste es una pasada.

**Cómo aplicarlo.** Una pasada nueva del Sistema se apunta siempre con `systemPassRef`, nunca escribiendo el prefijo a mano. Un marcador nuevo que no deba contar entra en `countAi` y en `hadSystemPass` a la vez. `npm run check:usage` y `tests/library/first-pass.test.ts` lo comprueban.
