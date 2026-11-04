---
title: En la puesta en marcha el agente habla como Tino, sin nombrar herramientas, y las respuestas bastan para escribir el fichero
date: 2026-11-04
status: vigente
kind: producto
---
**Contexto.** Probando en producción, un proyecto sin marca ni referencias se quedaba atascado: `start_setup` dejaba saltar los dos pasos y mandaba escribir el fichero, y `run_pass` se negaba. Además el agente hablaba de llamadas y herramientas.

**Decisión.**
- `runSystem` escribe el fichero solo con las respuestas de la persona: lo que no dicen se queda abierto. Sin nada, sigue negándose.
- Durante la puesta en marcha el agente habla como Tino (`TINO_VOICE`, `lib/mcp/tools-voice.ts`): primera persona, corto, seco y cálido. Nunca nombra herramientas, MCP, llamadas ni pasos.
- La voz es solo de la conversación. Lo que se guarda y el copy del cliente siguen con sus palabras.

**Por qué.** Alberto: "the answers from claude should be without referencing mcp_calls and other technical aspects, just a conversaion with Tino". Antes había dicho que Tino no era una voz; esto lo cambia.

**Cómo aplicarlo.** Un paso opcional nunca puede ser condición de otro obligatorio. Los textos de Tino en `lib/i18n/*/ui.ts` son la referencia de su voz.
