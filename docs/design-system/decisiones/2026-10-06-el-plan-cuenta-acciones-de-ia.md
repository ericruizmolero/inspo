---
title: El plan cuenta acciones de IA, no DESIGN.md
date: 2026-10-06
status: vigente
kind: producto
supersedes: La cuota mensual de DESIGN.md por plan (3, 25 y 100), montada el 21-09 sin fichero de decisión
---
**Contexto.** El medidor del plan decía "6/100 DESIGN.md". Desde que la ficha DESIGN.md salió de la ingesta y del panel (05-10) ningún botón genera uno, así que el contador estaba congelado. Mientras, lo que sí gasta (las pasadas del sistema, el agente del buscador, importar una marca) ni se contaba ni tenía tope: en Savvia, 137 pasadas y 0,60 $ en seis días de octubre.

**Decisión.**
- El plan mide **acciones de IA** al mes: Solo 30, Studio 500, Agency 2.000 (`aiActionsPerMonth` en `lib/plans.ts`).
- Cuenta lo que una persona le pide al modelo: las filas de `ai_usage` con acción `system`, `brand`, `polish`, `design_md`, `design_why`, `revise` o `explain` (`AI_ACTIONS` en `lib/quota.ts`).
- No cuenta lo que sale solo: etiquetas, embeddings y capturas al guardar, ni las pasadas registradas con `ref` que empieza por `auto:` (`AUTO_REF`): la relectura del tablón al archivar una referencia y la pasada de marca encadenada a "Mejorar con IA". Un clic en "Mejorar con IA" es una acción.
- El `auto: true` del cuerpo de la petición solo pide; lo decide el servidor (`autoSystemPass` y `autoBrandPass` en `lib/usage-core.ts`, #91). Una relectura es automática si el tablón cambió desde la última pasada y el proyecto no pasa de `AUTO_SYSTEM_PER_DAY` al día. Una pasada de marca es automática una vez por cada pasada del sistema que contó, en los 10 minutos siguientes. Lo demás cuenta como acción. `npm run check:usage` lo comprueba.
- Al llegar al tope, `assertQuota(ws, "ai")` responde 402 en `/api/system`, `/api/system/brand`, `/api/system/options`, `/api/system/curate`, la pregunta de `/api/system/start`, `/api/agent` (pedir, no confirmar ni deshacer) y `/api/design-md`. Las pasadas automáticas también se paran, aunque no sumen.
- En la interfaz: "146/2.000 IA" en el medidor del menú (`PlanMeter`, que se relee cada vez que el menú se abre), "Acciones de IA este mes" en Ajustes › Plan y "N acciones de IA al mes" en las tarjetas de plan. Las búsquedas con IA siguen con su contador aparte.

**Por qué.** Eric, 06-10: "igual lo de DESIGN.md ya no tiene sentido, ¿no?", "o sea sí, a uso de la IA, pero ese término no sé". Sobre la propuesta de "acciones de IA" con 30, 500 y 2.000: "dale con tu propuesta". Las cifras son interpretación nuestra a partir del coste medido: una acción cuesta unos 0,004 $ de media, así que el tope de Agency son unos 10 $ al mes en un plan de 79 €; los límites viejos estaban pensados para un DESIGN.md de 0,30 $ y habrían bloqueado a Savvia el día 4. "Acciones" y no "créditos" porque créditos suena a saldo que se compra y no hay pago en la web.

**Cómo aplicarlo.** Una llamada nueva a un modelo que alguien pide a mano entra en `AI_ACTIONS` y su ruta pasa por `assertQuota(ws, "ai")`. Si la llamada sale sola, se registra igual con `recordUsage()` pero con `ref` de `AUTO_REF` o con una acción que no esté en la lista. Que salga sola lo decide el servidor con lo que ve, nunca un campo de la petición. No volver a nombrar el plan por un entregable concreto: los entregables cambian, el uso de IA no. Las cifras tocan el precio: cambiarlas es cosa de los socios.
