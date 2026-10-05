---
title: Toda acción se puede hacer a mano o pedírsela al agente
date: 2026-10-02
status: vigente
kind: producto
---
**Contexto.** Se estaban añadiendo botones y modales para cada operación del sistema.

**Decisión.** "Todas las acciones o a mano o por el agente". El buscador es la entrada del agente (`lib/agent.ts`, `/api/agent`): planifica con un catálogo de acciones y ejecuta las mismas funciones que los botones. Lo destructivo vuelve como pendiente (Hazlo / Déjalo).

**Por qué.** La IA propone, el equipo confirma ("agente primero, confirmación final del usuario").

**Cómo aplicarlo.** Una acción nueva entra en el catálogo del agente además de tener su botón. Si una orden tiene dos lecturas, el agente pregunta.
