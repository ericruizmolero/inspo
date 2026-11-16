---
title: Tino recomienda recursos al tablón que empieza, tipografía primero
date: 2026-11-16
status: vigente
kind: producto
---
**Contexto.** Un tablón vacío o con pocas referencias pedía "añade más" sin decir dónde buscarlas. Los sitios donde miramos nosotros ya están en Descubrir (Recursos, `marketing-site/src/resources.ts`), pero lejos del tablón.

**Decisión.**
- `START_TOPICS` en `lib/resources.ts` fija qué se recomienda al empezar y en qué orden, por lo que necesita un proyecto y no por los grupos de Descubrir: tipografía, color, webs de referencia, botones y detalles, secciones, movimiento, iconos, logo y marca, imagen y ambiente. Cada tema tiene título y entradilla en los dos idiomas, hasta tres recursos elegidos por nombre de toda la lista (`names`; sin ellos, los primeros de su grupo) y el grupo de Descubrir que abre "Ver todas" (`group`). `startPicks` los resuelve; un nombre que sale de la lista desaparece solo.
- Tablón vacío (`BoardStart`): bajo la pregunta de Tino hay una respuesta "¿Dónde miro?". Abre un globo con el título y la entradilla del tema, sus recursos como respuestas (abren la web en otra pestaña), "Ver todas" (Descubrir filtrado en su grupo, `initialGroup` de `Discover`) y el tema siguiente. La × vuelve a la pregunta.
- Tablón con menos de `FEW_REFS` (8) referencias: un aviso más de `boardNudges`, `look:<tema>`, con el tema y sus nombres en una frase y el botón "Verlas". Sale el primer tema del orden que no se haya contestado con "Ya lo sé" en ese tablón, así que descartar tipografía pasa a color. Sigue la regla de siempre: Tino lo dice cuando le pulsan.
- Sin IA: son reglas y la lista curada.

**Por qué.** Eric: "molaría que si tienes el tablón vacío o empezando con pocas refes... que criterio te vaya recomendando cosas de recursos a inspirar", "seguramente empezaría por las cosas importantes al empezar un proyecto, tipografía" y "también alguna librería de detalles tipo botones" y "hay que preparar más cosas... diferentes paletas de colores, o referencias web... todo orientado a lo que tenemos en Recursos". Interpretación mía: el orden a partir de color, qué tres salen en cada tema y sus entradillas. Hueco conocido: Recursos no tiene sitios de paletas (color sale con dos de degradados) ni nada para voz.

**Cómo aplicarlo.** Para cambiar qué se recomienda, en qué orden o cuáles salen, se toca `START_TOPICS`. Un recurso nuevo entra primero en `marketing-site/src/resources.ts` (con su miniatura) y después se nombra en su tema: Tino solo recomienda lo que está en Recursos.
