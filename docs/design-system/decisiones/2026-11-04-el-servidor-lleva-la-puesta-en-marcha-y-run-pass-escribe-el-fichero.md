---
title: El servidor lleva la puesta en marcha y run_pass escribe el fichero con el mismo modelo en todas las puertas
date: 2026-11-04
status: vigente
kind: producto
supersedes: en 2026-10-06-conector-mcp-lee-el-md-y-escribe-piezas, solo que lo que razona lo paga siempre el modelo del usuario
---
**Contexto.** La puesta en marcha debía ser la misma en Claude Code, Cursor, Codex, ChatGPT, Claude en la web y la propia web. Las skills no existen en los clientes web, y las propuestas de un agente esperan un sí en la app, así que un agente solo no llegaba a tener fichero.

**Decisión.**
- `lib/setup-core.ts` deriva el paso de cada proyecto de las filas de siempre, sin lista propia: proyecto, fuente, preguntas, referencias, criterio. Construir la landing es una oferta posterior, no un paso obligatorio.
- `start_setup` dice qué toca y cada escritura del conector devuelve el paso siguiente.
- Solo `goal` para la puesta en marcha. Fuente y referencias se pueden saltar. Una respuesta leída (`source: "read"`) no cuenta hasta que la persona la confirma.
- `run_pass` escribe el fichero con el mismo `runSystem` que la app, y `measure_site` mide una web pública en el servidor. Los cambios posteriores siguen siendo propuestas.

**Por qué.** Alberto eligió `run_pass` frente a las propuestas en la sesión de definición del 04-11, y que el fichero sea lo que completa la puesta en marcha ("You don't need references if what you want is only bring your brand"). Interpretación nuestra: un solo motor hace que la calidad se pueda medir y que mejorar la generación llegue a todas las puertas.

**Cómo aplicarlo.** Un cliente nuevo no lleva lógica propia: pregunta qué toca. Un paso nuevo se añade en `setup-core.ts`. Sigue sin aceptarse un criterio.md de vuelta de un cliente.
