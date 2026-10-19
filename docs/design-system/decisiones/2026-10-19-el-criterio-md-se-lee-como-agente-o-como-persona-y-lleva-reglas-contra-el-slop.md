---
title: El criterio.md se lee como Agente o como Persona, y lleva una lista de rechazos y reglas contra el UI slop
date: 2026-10-19
status: vigente
kind: producto
---
**Contexto.** Eric analizó Glaze (design.how/systems/glaze), un sistema de diseño pensado para que lo lea un agente: reglas con id y fuerza (MUST, NEVER, SHOULD), un porqué y un ejemplo bueno y malo, un orden de prioridad, una lista de rechazos y una página entera contra el slop. Del selector "Human / Agent" de esa página dijo: "me gusta mucho". Nosotros llamábamos a las dos caras del mismo fichero "Markdown" y "Documento", que hablan del formato y no de quién lee.

**Decisión.**
- Las pestañas de la página del proyecto pasan de "Markdown" y "Documento" a **Agent** y **Human** (en castellano, Agente y Persona): `t.doc.markdown` y `t.doc.document` en `lib/i18n/{en,es}/ui.ts`. Los ids de vista (`markdown`, `doc`) no cambian, ni la persistencia.
- criterio.md gana, justo tras "How to use this file", la sección **Never, at a glance** (`id: "rejects"`): las líneas de Nunca de las ocho áreas en una sola lista, agrupadas por el nombre del área. Marcada `(required)` como cada línea de Nunca. La escribe la app desde las áreas, así que no se edita a mano en la vista Agente (`SystemMarkdown` la deja fuera, como `project`, `brief` y `content`): editar una copia habría hecho que dos listas obligatorias se contradijeran.
- El punto 4 de "How to use this file" dice ahora que, donde el fichero no cubre algo, se para y se dice qué falta, se pregunta solo lo que el fichero no puede dar y no se inventa un color, un token, un componente ni un patrón.
- Skill nueva **no-ui-slop** ("Avoid UI slop", cruza todas las áreas): 17 reglas con id (`ui-no-stat-cards`, `ui-no-icon-tiles`, `ui-no-eyebrow`…), fuerza y porqué, adaptadas de las reglas anti-slop de Glaze, y arriba lo que las áreas del proyecto ya descartan. Convive con `no-ai-slop`, que es solo de texto. Está en `lib/md-skills-more.ts` y se instala como las demás (`skills/no-ui-slop`).
- El Nunca de un área se puede reescribir como reglas con la IA (`sharpenRules`): cada línea sale como `` `color-no-gradients` NEVER: … Porque … Bien: … Mal: … `` y llega como una propuesta bajo el área, nunca escrita por sí sola. El botón (chispa, `IconButton` quiet xs) vive en los `.mdv-tools` del título de cada área decidida. Lleva cuota de IA, como las opciones.
- Cada color de la marca puede llevar un "No vale para" (`notFor` en `BrandColorSchema`, opcional): se edita en la sección Color de la presentación, lo escribe la IA de la marca solo donde un mal uso es fácil, y sale como columna de la tabla de la paleta (solo si algún color lo lleva) y en el comentario de su variable CSS y de su token.
- El enlace público `/s/<token>/md` acepta `?part=` con `decisions` o el nombre de un área (`color`, `voice`…): solo esa parte, bajo la cabecera y "How to use this file". Es la misma lógica que el conector MCP, ahora en `partMd` (`lib/criterio-md.ts`).

**Por qué.** Eric: "me gusta mucho como tienen lo de Human / Agent para diferenciar lo que nosotros tenemos Markdown / Documento". Nombrar a quien lee explica la vista sin explicarla. Lo demás sale de lo que Glaze hace y nosotros no: un agente que lee una lista corta de rechazos al principio y unas reglas con id puede citar la que cumple o rompe. Interpretación mía: la lista de rechazos va derivada y no editable porque duplica contenido obligatorio.

**Cómo aplicarlo.** Un fichero para agentes se pide con el nombre de quien lo lee. Una sección que repite otra la escribe la app, nunca una persona. Las reglas nuevas del UI slop se escriben con id, fuerza y porqué. Falta, sin hacer: tablas "necesitas → usa" derivadas de la marca, casos límite por área y pantallas completas como bloques.

## Retoques tras leer un criterio.md real (2026-10-19)

- **GSAP y «sin librería» se excluyen:** activar uno apaga el otro (`MD_SKILL_EXCLUSIVE` en `lib/md-skill-ids.ts`, aplicado en `toggleSkill`). Un archivo con las dos daba al agente dos maneras de construir el mismo movimiento.
- **Las skills de iconos y de movimiento sin librería obedecen al área:** si el área descarta los iconos de stock no se instala ninguna librería, y las curvas CSS salen de lo que decide el área; sus números solo valen si el área no da ninguno.
- **Cada fuerza tiene su rótulo:** las reglas `` `id` MUST: `` y `` `id` SHOULD: `` salen bajo «Debe (obligatorio)» y «Conviene (orientativo)», no bajo «Nunca (obligatorio)» (`splitRules`). «Nunca, de un vistazo» lista solo los Nunca. El editor Markdown sigue viendo la lista entera.
- **Una referencia, un sitio para lo que aporta:** la entrada de cada referencia lista solo las áreas a las que aporta; el «Tomar» vive en la propia área.

## Segunda lectura de un criterio.md real (2026-10-19)

- **La plantilla de GSAP solo dice lo que aplica:** «registra una vez las propias» solo sale si hay curvas propias, y «la duración es la que midió la referencia» solo si alguna curva trae duración medida.
- **Un enlace a esta máquina no sale del archivo:** `blocksToMd` reescribe `localhost`, `127.0.0.1`, `0.0.0.0` y `[::1]` a `https://app.criterio.design` (`publicLinks`), se exporte desde donde se exporte. Una imagen subida solo en local sigue sin existir en producción: la dirección es pública, el fichero no.
- **Una captura que leyó una página de error no es «Qué es»:** `pageFailed` (`lib/page-failed.ts`) descarta el resumen del tagger y también los ya guardados al construir el archivo. Falta volver a capturar esa referencia a mano.
- **Del hilo de cada área solo salen las propuestas** (pendientes, aceptadas o rechazadas con su razón). Un comentario suelto sirve al equipo, no al agente.
- **Sin marca dibujada, «Tokens» reúne las frases de las áreas que llevan un valor** (`lib/area-tokens.ts`), tal cual, de todas las áreas, pero nunca de sus listas de Nunca, Debe o Conviene: una regla fuera de su lista pierde su polaridad («caras planas con contorno de 1px» se lee como una orden) y su fuerza. Primera versión: extraía los valores con expresiones regulares y falló (`clamp(20px, 4vw, 64px)` quedó en `20px`, «dos radios» en uno, perdía qué rojo es de relleno y cuál de texto, y no sacaba las fuentes), y su frase final convertía cada fallo en «ningún área lo ha decidido». Ahora no se interpreta nada: se copia la frase entera, y el texto dice que si falta un valor se busque en su área antes de preguntar. La escala tipográfica solo puede venir de la marca.
