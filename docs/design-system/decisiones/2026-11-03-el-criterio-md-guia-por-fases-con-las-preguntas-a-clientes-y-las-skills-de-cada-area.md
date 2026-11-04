---
title: El criterio.md guía por fases, con las preguntas a clientes y las skills de cada área
date: 2026-11-03
status: vigente
kind: producto
---
**Contexto.** Esta decisión amplía [la guía con recorrido](2026-11-03-el-criterio-md-es-una-guia-con-recorrido-no-un-prompt.md), que no sustituye. En la reunión del 03-11 el equipo acordó que el MD deje de ser "un ONE-SHOOT md". Pegado en Claude o ChatGPT, tiene que ir guiando de forma pertinente, como un playbook de buenas prácticas para trabajar con la IA. La referencia es github.com/smartwhale8/claude-playbook: un núcleo corto que siempre se lee, el detalle solo cuando hace falta, entrevistar antes de construir y enseñar pruebas en vez de afirmar. Además tiene que recoger las preguntas que ya hacemos a los clientes de web, recomendar las mejores skills de cada área y retroalimentarse por el conector mientras se habla.

**Decisión.**
- **Empieza aquí pasa a ser un bucle por fases**, cada una con un punto de control:
  1. Conectar.
  2. Entender: las preguntas pendientes, de una en una.
  3. Plan: esperar un sí.
  4. Construir por partes.
  5. Revisar con evidencia.
  6. Aprender: lo que la persona corrige o elige se guarda por el conector o se da en un bloque para pegar.

  Debajo van las preguntas pendientes y una sección nueva, **Lo aprendido**. Construido el 04-11: [fases, preguntas de arranque y lo aprendido](2026-11-04-empieza-aqui-son-fases-con-preguntas-de-arranque-lo-aprendido-y-una-version-por-cambio.md).
- **Preguntas a clientes:** `PLAYBOOK_QUESTIONS` en `lib/playbook-questions.ts`.
  - Son 16 preguntas en los 6 grupos que pasó el socio: proyecto, público y mensaje, lo que os hace únicos, estructura, marca y gusto, contenido y material. El texto está en castellano y en inglés.
  - Cada una dice qué áreas alimenta (`feeds`).
  - `fromBrief` la da por respondida si el brief ya lo sabe (about, firstSeconds, keep o web actual, nota de competencia o neverSay, competidores), así que no se pregunta dos veces.
  - "¿Qué webs os gustan?" se reformula con `withBoard` si hay referencias: se enseñan por sus códigos y se pregunta qué gusta de cada una.
  - `openQuestions` devuelve las pendientes.
- **Skills por área:** `AREA_SKILLS` en `lib/area-skills.ts`.
  - Cada área termina con **Skills recomendadas**: las mejores externas, libres y de otros autores, comprobadas en GitHub el 03-11 (repo, ruta y nombre).
  - Las nuestras solo salen si están activadas, y entonces dicen que su sección está más abajo. Nunca se recomienda instalarlas desde GitHub: el repo es el personal de Eric (corrección del 04-11, "las skills que salen de mi github personal evitar").
  - Lo que cruza todo el sistema va en una sección aparte, **Skills para todo el sistema** (`id: "skills-all"`).
  - Una externa escrita para un idioma (`only`) solo sale en el MD de ese idioma. En Voz, humanizer (tics del inglés) sale en el MD en inglés y humanamente (tics del castellano, MIT) en el MD en castellano. copywriting sale en los dos, avisando en castellano de que está pensada para inglés (corrección del 04-11: las de voz tienen que funcionar en castellano).
  - Logo no tiene externas: ninguna está a la altura de `logo-svg`. Sin `logo-svg` activada, Logo no lleva skills recomendadas.
  - Los bloques de área llevan `skillRecs`, que `SystemMarkdown` pinta sin dejarlo editar.
- **Conector:** las respuestas (`answer_question`) y lo aprendido (`record_learning`) se escriben directamente. Las decisiones de área siguen entrando como propuesta (`propose_decision`).
- **Versiones:** nace una con cada cambio con sentido, agrupando las ediciones seguidas del mismo autor. Se puede ir de la v1 a la última y ver qué cambió.
- **Catálogo** (`marketing-site/src/skills.ts`):
  - `adapt` pasa a `impeccable`: Impeccable ahora es una sola skill con comandos, y `--skill adapt` ya no instala.
  - `design-review` (30★) pasa a `web-design-guidelines` de Vercel.

**Por qué.** Eric: "el md una vez puesto en claude o chat gpt te va haciendo y guiando de forma pertinente", "de cada categoría principal lo suyo es exponer las skills más top" y "cada versión del MD tiene que ser clickable y poder ir desde la primera versión hasta la más reciente". Sobre las skills: "tendremos que indagar más en cuáles son las mejores", así que el top se investigó y Eric lo aprobó antes de entrar en código. La agrupación de versiones y que solo las decisiones pasen por propuesta las eligió Eric entre las opciones del plan. Interpretación mía: preguntar solo lo que falta y apoyarse en el tablero es lo que evita que la guía se convierta en un cuestionario.

**Cómo aplicarlo.**
- Una pregunta nueva va en `PLAYBOOK_QUESTIONS` con sus `feeds`. Si el brief ya la cubre, con su `fromBrief`.
- Una skill nueva va en `AREA_SKILLS`, solo después de comprobar en GitHub el repo, la ruta del SKILL.md y el `name`. Si va a Descubrir, también en `marketing-site/src/skills.ts`, y entonces hay que desplegar la web a mano.
- Lo que la IA pueda escribir sin aprobación se limita a respuestas y aprendizajes. Una decisión siempre es propuesta.
