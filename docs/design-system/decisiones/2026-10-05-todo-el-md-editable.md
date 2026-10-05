---
title: En criterio.md se puede escribir en todo, también en los títulos
date: 2026-10-05
status: vigente
kind: diseño
---
**Contexto.** En la vista Markdown casi todo el cuerpo se escribía en el sitio, pero los títulos `##`, las secciones de skills, la intro del Contenido y las líneas de "Guardado por" y "Dicho" de cada texto no. A la vista no se distinguía una cosa de la otra.

**Decisión.** Todo el fichero se escribe en el sitio (`components/SystemMarkdown.tsx`). Lo que la app escribe y el equipo reescribe se guarda como parte a mano en `system.doc` (`types/system.ts` `isDocPart`, `lib/criterio-md.ts`): `title:<bloque>` para cada título, `skill:<id>` para una sección de skill, `brand-intro` y `brand-tokens` para la marca, `content-intro` y `texthead:<referencia>`. Un título vaciado vuelve al de la app. El estado y las referencias de cada área no se guardan como copia: al salir del texto se leen de vuelta al tablón (`readAreaMeta` en `lib/criterio-md.ts`, `setAreaEvidence` en `lib/system.ts`). Las referencias citadas por código (`**R3**`) pasan a ser las del área, con lo que dice "Tomar"; "Decidido" confirma el área y "Propuesto" la devuelve al tablón. Lo dicho bajo cada referencia y la conversación son registro y vuelven como estaban. Solo quedan fuera la vista de solo lectura y el modo Comentar.

**Por qué.** Eric: "que es editable y qué no? no queda claro" y "deberia ser todo no?". Interpretación: si hay excepciones, el documento obliga a adivinar dónde se puede escribir; sin excepciones no hace falta ninguna señal.

Eric, a la pregunta de si lo cambiado en el Markdown debía llegar al tablón: "si!".

**Cómo aplicarlo.** Una parte nueva de criterio.md nace editable: se pinta con `written()` y, si la escribe la app, guarda su versión a mano con `onPart`. Nada de líneas que parezcan texto y no se dejen escribir.
