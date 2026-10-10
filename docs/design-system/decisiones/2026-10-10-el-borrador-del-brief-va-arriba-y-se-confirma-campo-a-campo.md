---
title: El borrador del brief va arriba, bajo "Esto es lo que hemos entendido", y se confirma campo a campo o todo a la vez
date: 2026-10-10
status: vigente
kind: diseño
---
**Contexto.** Con #128 el brief se rellena solo: al poner la web del cliente o importar un documento, una llamada con `SYSTEM_MODEL` (`lib/brief-draft.ts`) escribe `sector`, `product`, `markets`, `traits`, `keep` y `voiceSamples`, y los marca en `drafted`. Hacía falta decidir cómo se enseña en el panel Brief, cómo se confirma, cómo cuenta para el plan y cómo preguntan Color y Voz su campo. Sale de [el brief pide una frase](2026-10-10-el-brief-pide-una-frase-y-el-resto-se-rellena-solo.md).

**Decisión.**
- En `BriefPanel`, los campos que escribió la IA van primero, en `.brf__understood`, bajo el título "Esto es lo que hemos entendido" / "This is what we understood" y la línea que explica el borrador. El grupo es plano y lo cierra una línea `--border`. A la derecha del título, "Confirmar todo" (`Button` quiet s con `check`); cada campo en borrador lleva al final de su pregunta un `IconButton` quiet s con `check` ("Confirmar: <pregunta>"). Confirmar es guardar el valor tal cual: el campo sale de `drafted` como si se hubiera editado.
- El grupo no cambia mientras el panel está abierto: confirmar o editar quita la marca "borrador" pero el campo no se mueve de debajo del cursor. Si el borrador llega con el panel abierto (por el pulso, cada 15 s), entra en el grupo; un campo que alguien tocó en el panel no lo pisa nunca.
- El borrador corre después de responder (`after()` de Next, `draftBriefAfter`), al poner la web del cliente (`setProjectClient`, también la del agente) y al importar un texto (`/api/system/brand/import-text`). Pasa por `assertQuota` como el resto, pero se apunta en `ai_usage` con `AUTO_REF` (`auto:project:<id>:brief-draft`): nadie lo pidió, así que no gasta una acción de IA del plan; un espacio sin acciones no tiene borrador.
- `startAreaAsk` pregunta antes que nada el campo del brief que le falta al área: Color, el nivel de accesibilidad (WCAG AA o AAA) si `a11y` es null; Voz, "¿Algo que la marca nunca diría?" si `neverSay` está vacío. Sin llamada al modelo y con el texto de la interfaz (`t.system.briefAsk`). La respuesta lleva `brief: "a11y" | "neverSay"`: la opción elegida (o la respuesta libre) se guarda con `saveProjectBrief`. Con el campo puesto, el área hace su pregunta de siempre.

**Por qué.** Interpretación de quien lo implementó, sin validar todavía con el equipo:
- Agrupar arriba responde a "Esto es lo que hemos entendido" de la decisión de origen: se lee como una propuesta que revisar, no como campos sueltos.
- Que el grupo no se mueva evita que un campo salte mientras se escribe en él (se guarda a los 900 ms y saldría de `drafted`).
- Un borrador que nadie pidió no debe gastar el plan, como la relectura automática del tablero; la cuota sigue mandando para que un espacio sin acciones no pague modelos.

**Cómo aplicarlo.** Lo que escribe un modelo en un formulario va junto, arriba, con su confirmación por campo y para todo, y no se mueve mientras se edita. Una llamada que corre sola al guardar se apunta con `AUTO_REF` y pasa la cuota. Un campo del brief que pide un área va antes que la pregunta del área, una sola vez.
