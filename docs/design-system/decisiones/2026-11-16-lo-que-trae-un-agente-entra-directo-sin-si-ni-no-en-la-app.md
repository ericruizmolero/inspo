---
title: Lo que trae un agente entra directo, sin sí ni no en la app
date: 2026-11-16
status: vigente
kind: producto
supersedes: la parte de sugerencias de 2026-11-09-fuera-los-formularios-crear-un-proyecto-es-solo-el-nombre-y-el-resto-llega-por-el-mcp.md
---
**Contexto.** Desde el 09-11, lo que un agente traía por su cuenta (`bring_context`, `add_reference` con `suggested`) esperaba como sugerencia: cada tarjeta llevaba una pastilla butter "Propuesto por Claude" con aceptar y descartar, y sobre el tablón una línea "Tino te ha dejado N cosas" con Revisar, Descartar todo y Aceptar todo. En la práctica se aceptaba todo siempre, y la pastilla repetía lo que el pie de la tarjeta ya dice con el avatar de quien lo trajo y la marca del agente.

**Decisión.**
- Lo que trae un agente entra en el proyecto en la misma llamada: `takeIn` (`lib/suggestions.ts`) es el último paso de `bring_context` (`lib/mcp/context.ts`), de `add_reference` y `upload_link` con `suggested`, y de `answer_question` con `source: "agent"` (`lib/mcp/pieces.ts`). Archiva las referencias con su papel y sus áreas, hace del proyecto las respuestas del agente y deja el plan sin `draft`.
- Fuera de la interfaz: la pastilla de la tarjeta (`.tile__suggest`, la prop `suggestion` de `InspoCard`) y la línea del tablón (`SuggestedLine.tsx`, `SuggestedLine.css`, las cadenas `suggested` de `lib/i18n`).
- La fila de `project_suggestion` se queda con `state: "accepted"` (migración `0059_suggestions_accepted`) para que traer lo mismo otra vez actualice en vez de duplicar. Si la referencia se quitó del tablón, vuelve; si sigue en él, no se toca.
- Lo que quedó esperando de antes se mete solo al abrir su proyecto (`components/InspoClient.tsx`).
- Siguen esperando dos cosas: las propuestas de área (`propose_decision`), que el equipo contesta bajo su área, y lo que el agente leyó de la web (`source: "read"`), que la persona confirma en la conversación.

**Por qué.** Eric: "lo de propuesto por claude ya quitar porque está el iconito con la foto del usuario con eso basta, que se apruebe todo siempre". Interpretación mía: un paso de aprobación que siempre dice sí es ruido, y lo que no se quiera se quita del tablón como cualquier otra referencia.

**Cómo aplicarlo.** Nada de lo que trae un agente como material (referencias, textos, respuestas suyas, un plan) pide aprobación en la app, y no se marca la tarjeta con quién lo propuso: eso lo dice el pie. Lo único que espera un sí es lo que cambia qué dice un área.
