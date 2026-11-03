---
title: El criterio.md es una guía con recorrido, no un prompt
date: 2026-11-03
status: vigente
kind: producto
---
**Contexto.** El criterio.md se leía como un prompt enorme: el agente recibía todo de golpe (reglas, ocho áreas, referencias) sin saber por dónde empezar, qué preguntar ni cuándo había terminado. Alex lo dijo al probarlo: "hacer un MD de todo con las referencias me parece complicado"; lo que quería era "genérame la página About". El recorrido ya existía, pero solo en el prompt `design_with_criterio` del conector: pegado a mano en Claude o ChatGPT, el fichero no lo llevaba. Eric planteó "no ser tanto un prompt sino una guía para ir consiguiendo lo que necesita el usuario" y eligió que la guía sea para el agente, paso a paso, dentro del mismo MD, con dos objetivos: hacer páginas concretas y cerrar el sistema.

**Decisión.**
- criterio.md abre, tras la cabecera, con **Empieza aquí** (`id: "guide"`, `strings.guide` en `lib/i18n/{en,es}/ui.ts`, montado en `criterioBlocks` de `lib/criterio-md.ts`). Lo escribe la app desde el estado del proyecto y no se edita a mano (`SystemMarkdown` lo deja fuera, como `rejects`). Tiene cuatro partes: **Primero** (qué ofrecer si la persona no ha dicho qué quiere: las páginas de las que hay referencias, con cuántas, y las áreas por cerrar), **Para hacer una página** (qué leer, plan corto y esperar un sí, construir primero lo de arriba), **Para cerrar lo que falta** (las áreas abiertas o con confianza baja y sus códigos R; opciones concretas sacadas de las referencias; la decisión con la forma del fichero; `propose_decision` con el conector o un bloque para pegar sin él) y **Antes de entregar** (una lista de comprobación).
- "Cómo usar este archivo" sigue igual, justo debajo: es la referencia de qué obliga y qué gana cuando chocan, y la guía la cita.
- El conector lee la guía sola con `read_criterio` sección `"guide"` (cabecera, Empieza aquí, Cómo usar y Nunca, de un vistazo; `CRITERIO_PARTS` en `lib/criterio-md.ts`). `design_with_criterio` empieza por ahí y sigue el recorrido en vez de repetirlo, y hay un prompt nuevo, **Cerrar lo que falta** (`close_open_areas`), que va área por área (`lib/mcp/prompts.ts`).
- La cabecera del fichero (`strings.md.intro`) dice que es una guía y que se empieza por Empieza aquí.

**Por qué.** Eric: "la idea es no ser tanto un prompt sino una guía para ir consiguiendo lo que necesita el usuario". Que la guía viva en el fichero hace que funcione igual pegada a mano que por el conector, y que salga del estado del proyecto hace que el agente ofrezca lo que de verdad puede sostener (la About si hay referencias de About, Movimiento si sigue abierto) en vez de un menú genérico. Interpretación mía: pedir un plan corto y un sí antes de construir es lo que convierte el fichero en conversación y no en un volcado.

**Cómo aplicarlo.** Una sección nueva del fichero se pregunta primero si la guía tiene que mandar a ella (y en qué receta). Un dato nuevo del proyecto que cambie qué se puede ofrecer (un tipo de página, un estado de área) entra por `GuideMdKeys`, no como texto fijo. Las instrucciones de cómo trabajar con la persona van en Empieza aquí, no en los prompts del conector, que solo dicen qué leer primero.
