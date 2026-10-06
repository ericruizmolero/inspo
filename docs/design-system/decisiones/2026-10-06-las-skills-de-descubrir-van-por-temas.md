---
title: Las skills de Descubrir van por temas
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** Descubrir › Skills era una sola lista de 26 tarjetas: primero las trece de criterio.design y después las de otros autores. En la reunión del 6 de octubre quedó dicho que había que categorizarlas.

**Decisión.** Las skills se agrupan por tema, con el mismo encabezado de grupo que los recursos (`.disc-list__head`, solo el título). Los temas y su orden están en `SKILL_TOPICS` (`lib/directory.ts`): tipografía, color y layout; movimiento; iconos, logo e imagen; voz; interfaz y componentes; revisión y accesibilidad. Cada skill ajena lleva su `topic` en `SKILLS` y las propias en `MD_SKILL_TOPIC`, que no compila si una skill nueva se queda sin tema. Dentro de cada tema van primero las de criterio.design. Los títulos están en `discover.skills.topics` de los dos idiomas. A la derecha de la barra, donde Recursos tiene "Tipos de recurso", Skills tiene el menú "Temas" (el mismo `picker` de `components/Discover.tsx`, botón `.disc__group`): deja un tema o todos. A su lado van las mismas tres pestañas que en Recursos (Todo, Recién llegados, Destacados): recién llegadas son las que llevan fecha `added` de los últimos 30 días, y las destacadas son la lista a mano `FEATURED_SKILLS` de `lib/directory.ts`. El enlace "Más en UI Skills" que ocupaba ese sitio se retira, y con él la entrada del catálogo en `SKILLS`; las skills que vienen de ui-skills.com se quedan.

**Por qué.** Claude ofreció dos caminos: separar por autor, que era el orden que ya tenían, o por tema. Eric: "Por categorías creo que bien", y al verlo descrito: "como tiene recursos pon a la derecha el selector de categorias y quita lo de UI skills", y después: "también pongamos recién llegados y destacados". Las seis destacadas iniciales las eligió Claude; la lista es de Eric. Los seis temas los propuso Claude siguiendo las áreas del sistema; no se revisaron uno a uno.

**Cómo aplicarlo.** Una skill nueva entra con su tema. Un tema nuevo solo cuando haya varias skills que no quepan en los seis: un grupo de una tarjeta no ordena nada.
