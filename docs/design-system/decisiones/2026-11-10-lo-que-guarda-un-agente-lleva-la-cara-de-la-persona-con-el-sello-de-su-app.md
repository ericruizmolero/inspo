---
title: Lo que guarda un agente lleva la cara de la persona con el sello de su app
date: 2026-11-10
status: vigente
kind: diseño
---
**Contexto.** Cuando Claude o ChatGPT rellenan referencias por el MCP, la nota bajo la tarjeta salía con la foto de quien tenía el conector, como si la hubiera escrito a mano. Probamos primero a poner el logo de la app en lugar de la cara, con el nombre de la app en negrita ("Claude Competidor histórico…"), y se descartó ese mismo día.

**Decisión.** La nota que guarda un agente (la referencia tiene `via`) lleva el avatar de la persona y, encima, en la esquina de abajo a la derecha, el logo de la app en pequeño: `AgentBadge` en `components/criterio/index.tsx` (`.cr-agent`, `.cr-agent__mark`: la mitad del avatar, mínimo 10 px). El logo va sin círculo detrás, la forma sola pintada como máscara CSS: Claude en #D97757, ChatGPT en `--text` (blanco en oscuro, negro en claro), Gemini con su degradado. Sale de `agentMark` (`lib/agent-mark.ts`, formas en `public/agents/`); otra app, su inicial en un círculo chrome. Va en el pie de la tarjeta (`InspoCard`), en el pie de Pulido (`PolishView`) y en la ficha (`CommentsPanel`), donde el nombre sigue con "vía Claude" apagado (`.cm-msg__by`).

**Por qué.** Eric: "igual es mejor en esos casos poner la foto el usuario y en pequeño el iconito de claude en absolute sabes? como un asterisco o asi". Y del logo: "que no tengan el fondo blanco mejor... directamente". Interpretación: la nota sigue siendo de la persona (el agente trabaja para ella) y el sello solo dice por dónde llegó.

**Cómo aplicarlo.** Lo que hace un agente en nombre de alguien se firma con la cara de esa persona y el sello de la app, nunca con el logo solo. Para un avatar nuevo de algo hecho por MCP, envolverlo en `AgentBadge` con `agent={{ name: via, mark: agentMark(via) }}`.
