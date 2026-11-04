---
title: Si falta copy, el agente escribe un borrador y marca solo los datos que no puede respaldar
date: 2026-11-04
status: vigente
kind: producto
---
**Contexto.** El criterio.md y el prompt `design_with_criterio` decían que un hueco nunca se rellena con un valor por defecto. En la prueba a ciegas del 04-11 (`npm run eval:baseline`, misma tarea con y sin el fichero) el agente obedeció y dejó páginas casi vacías: 66 a 187 palabras y hasta 31 corchetes frente a más de 300 palabras sin el fichero. El fichero ganó 1 de 5. Con esta regla cambiada y las mismas respuestas en los dos lados ganó 3 de 5.

**Decisión.**
- En `design_with_criterio` (`lib/mcp/prompts.ts`) y en "Empieza aquí" y "Cómo usar este archivo" (`lib/i18n/{en,es}/ui.ts`), cuando nadie puede responder el agente sigue con lo que sabe: escribe un borrador real del copy en la voz del proyecto y marca solo un dato que no pueda respaldar, como una cifra, un cliente o una cita.
- Un titular o una sección nunca quedan vacíos.
- Lo decidido no cambia: un valor decidido no se sustituye, y un color, un token, un componente o un patrón no se inventan.

**Por qué.** Alberto aprobó probar el cambio al ver que el fichero dejaba las páginas vacías. Interpretación nuestra: una página sin palabras no enseña el criterio, y la regla protegía contra inventar datos, no contra escribir.

**Cómo aplicarlo.** Inventar sigue prohibido para lo que es un hecho. Escribir copy de borrador no es inventar. La marca va en el dato, no en el titular entero.
