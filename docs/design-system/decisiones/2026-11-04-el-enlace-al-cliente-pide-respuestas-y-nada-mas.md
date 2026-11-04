---
title: El enlace al cliente pide respuestas y nada más, y la web hace la misma puesta en marcha que el agente
date: 2026-11-04
status: vigente
kind: producto
---
**Contexto.** Un freelance no suele saber las respuestas: las tiene su cliente. El panel Brief salió de la app el 04-11 y las preguntas quedaron sin sitio en la web.

**Decisión.**
- `ProjectStart` tiene tres pasos: De qué va, Preguntas y Referencias. Las preguntas salen de la misma lista que usa el agente.
- `BriefPanel` se borra. Las respuestas se editan en `SetupQuestions`, también desde el "…" de Sistema.
- "Preguntar al cliente" crea un enlace `/a/<token>` (tabla `client_ask`, `lib/client-ask.ts`), sin cuenta, que solo enseña el nombre del proyecto y las preguntas abiertas. Un agente lo pide con `start_setup` y `ask_client`.
- Al pulsar Enviar se guardan con `source: "client"` y quien lo mandó recibe un correo. El fichero no cambia solo.
- La web termina en criterio.md y la nota de Tino pide conectar el agente; copiar queda en segundo lugar.
- Primeros pasos pide 3 referencias, no 10.

**Por qué.** Alberto eligió las respuestas por enlace y que los comentarios sigan pidiendo cuenta, y "the website ends at criterio.md" con conectar como acción principal. Interpretación nuestra: el enlace es lo primero que se hace sin cuenta, así que no abre nada más.

**Cómo aplicarlo.** No añadir al enlace datos del proyecto. Una pregunta nueva de la puesta en marcha entra en `SETUP_ROLES` y aparece en las dos puertas.
