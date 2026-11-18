---
title: El enlace que da el agente abre el Tablón, no el Sistema
date: 2026-11-16
status: vigente
kind: producto
---
**Contexto.** Cuando Claude, por el conector, termina de dejar cosas en un proyecto, escribe "abrir el proyecto" con la dirección `/p/<id>`. Esa dirección sin vista abría el Sistema, y la persona llegaba a una vista distinta de la que abre la app al entrar en un proyecto.

**Decisión.** `projectUrl` en `lib/mcp/pieces.ts` devuelve `/p/<id>?view=board`, así que todas las herramientas del conector entregan una dirección que abre el Tablón. `app/p/[id]/route.ts` no cambia: una dirección sin vista sigue abriendo el Sistema, que es lo que usan los correos (`mailPath` en `lib/notify.ts`, la respuesta a una propuesta, las respuestas del cliente).

**Por qué.** Eric, el 16-11: "que cuando se abra el proyecto desde claude se te abra el tablón no el sistema". Interpretación mía: el Tablón es la vista por defecto del proyecto en la app y allí está la línea de lo que espera revisión, que es justo lo que el agente acaba de dejar.

**Cómo aplicarlo.** Un enlace nuevo que entregue un agente sale de `projectUrl`, no se monta a mano. Si un correo o una herramienta necesita otra vista, la pide con `?view=` en la dirección; no se cambia el valor por defecto de `/p/`.
