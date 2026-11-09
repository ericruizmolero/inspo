---
title: Fuera los formularios; crear un proyecto es solo el nombre y el resto llega por el MCP
date: 2026-11-09
status: vigente
kind: producto
---
**Contexto.** Un agente que llegaba con contexto ya trabajado (investigación, brief, referencias, respuestas, un plan de landing) solo podía crear el proyecto y contestar preguntas sueltas: el tablero se quedaba vacío. A la vez, la app seguía preguntando lo mismo en formularios propios: el arranque de un proyecto vacío (`ProjectStart`) pedía de qué va el proyecto y las preguntas de arranque (`SetupQuestions`), y el Sistema las abría otra vez en un diálogo desde su menú.

**Decisión.**
- Crear un proyecto en la app pide solo el nombre. El arranque de un proyecto vacío (`ProjectStart`) es un único paso: añadir referencias a mano (pegar un enlace, soltar o pegar una imagen, traer de la librería) y conectar tu IA.
- `SetupQuestions` sale de `ProjectStart` y del menú del Sistema (`SystemView`). El componente queda en el código.
- Todo lo demás entra por el MCP. El agente pregunta en la conversación, o vuelca de una vez lo que ya sabe con `bring_context` (`lib/mcp/context.ts`): brief, notas de investigación con sus fuentes, referencias con su papel (`current-site`, `competitor`, `inspiration`, `press`, `material`), respuestas, un borrador de outline, direcciones de hero y propuestas de área.
- Lo que trae el agente por su cuenta entra como sugerencia (`project_suggestion`, `lib/suggestions.ts`; respuestas con `source: "agent"`; outline con `draft`). El tablero lo enseña marcado y el equipo lo acepta o lo descarta, uno a uno o todo a la vez. Lo descartado se recuerda y no vuelve.
- Lo que no llegó por el MCP lo pregunta Claude siguiendo el "Empieza aquí" de criterio.md.
- Añadir referencias a mano se queda como estaba, y lo que se añade a mano entra aceptado.
- La línea del tablero dice "Tino te ha dejado N cosas" y el origen detrás, sin punto medio.

**Por qué.** Eric: "la idea es que todo vaya mediante MCP al crear un proyecto... que sea fácil crearlo para el usuario", "obviamente si quiere añadir cosas manualmente pues manualmente", "pero formularios en general para el usuario FUERA", "crear un proyecto tiene que ser solo nombre... el MCP es el que te pregunta si eso por más cosas" y "es el prompt final de sistema quien te preguntará por cosas en Claude si no las tienes escritas antes por MCP". Interpretación mía: es la misma regla que sacó el Brief el 04-11 ([decisión](2026-11-04-el-brief-y-la-presentacion-salen-sus-preguntas-son-pasos-del-md.md)), llevada al arranque: un formulario en la app pregunta dos veces lo que el agente ya pregunta.

**Cómo aplicarlo.** No se añade ningún formulario de datos del proyecto a la app: una pregunta nueva va en `PLAYBOOK_QUESTIONS` y un dato nuevo, en el MCP. En la app solo se añaden referencias a mano, se escribe en el sitio dentro del criterio.md y se acepta o descarta lo que propone un agente. Lo que un agente trae sin que se lo pidan nunca entra como decisión.
