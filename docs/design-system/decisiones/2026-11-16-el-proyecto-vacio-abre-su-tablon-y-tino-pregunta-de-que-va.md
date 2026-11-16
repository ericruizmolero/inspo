---
title: El proyecto vacío abre su tablón y Tino pregunta de qué va
date: 2026-11-16
status: vigente
kind: producto
supersedes: la tarjeta de arranque de "El proyecto vacío es una tarjeta plana sin barra moss" (12-10) y, solo en el tablón vacío, "Tino entra callado" (06-11) y "El buscador solo sale sobre un tablón con referencias" (06-10)
---
**Contexto.** Un proyecto recién creado abría `ProjectStart`: una tarjeta en mitad de la pantalla con un campo para pegar un enlace y la librería entera para elegir. Hasta que no entraba una referencia no se veía el tablón, así que crear un proyecto se leía como un requisito previo y no como un sitio donde ya se está.

**Decisión.**
- Un proyecto sin referencias abre su tablón, vacío (`Grid`), con su pastilla y sus nubes. `ProjectStart` desaparece.
- Tino habla primero desde su esquina, abajo a la derecha, aunque esté dormido (`BoardStart`, `components/BoardStart.tsx`, sobre `TinoDock` con `say`): pregunta qué se va a hacer ("¿Qué vamos a hacer aquí?") y, cuando el proyecto ya tiene su frase (`brief.about`), pide referencias. El globo no lleva × mientras el tablón siga vacío.
- El dock lleva un solo campo (`.tdock`): una frase se guarda como `about` del brief (`saveProjectBrief`), un enlace se guarda como referencia del proyecto. Si el enlace es una web y el proyecto no tiene web del cliente, Tino hace una pregunta con dos respuestas en su globo: "La rediseño" (la guarda y la marca con `setProjectClient`) o "Es una referencia".
- A la derecha del campo, dos `IconButton` quiet s: "De tu librería" (`inbox`), que abre el selector en un diálogo (`LibraryPick`, `components/LibraryPick.tsx`, modal `lg`), y "Añadir" (`plus`), el diálogo de siempre. Soltar o pegar una imagen funciona como en cualquier tablón.
- "Hacerlo con tu agente" va como respuesta en el globo de la primera pregunta (abre `ConnectDialog`).
- En cuanto hay una referencia, vuelven el buscador y `SearchTino`.
- Con el espacio entero sin referencias sigue saliendo `EmptyStart`.

**Por qué.** Eric: "cuando creas un proyecto esta primera requerimiento de subir una referencia antes de ver el tablón no tiene tanto sentido", "lo que tendría que aparecer es el tablón vacío con Tino diciéndote abajo a la derecha que empieces a subir alguna referencia", "o que te incite a que le des el briefing del proyecto... qué quieres hacer? la web que quieres rediseñar por ejemplo". Interpretación mía: que Tino hable sin que le pulsen y que haya campo sin nada que buscar son excepciones a dos reglas vigentes, válidas solo aquí, porque un tablón vacío no dice nada por sí mismo; y la pregunta de Tino no reabre los formularios retirados el 09-11: es una frase en el dock, opcional, y lo demás sigue llegando por el MCP.

**Cómo aplicarlo.** Una vista vacía enseña la vista, no una antesala. Lo que haga falta para empezar lo pide Tino en su globo y se contesta en el dock, una cosa cada vez; nunca más de una pregunta seguida ni campos nuevos. Fuera del tablón vacío, Tino sigue entrando callado.
