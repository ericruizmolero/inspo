---
title: Los textos de la portada dicen cada cosa una vez y con las mismas palabras, en los dos idiomas
date: 2026-11-24
status: vigente
kind: diseño
---
**Contexto.** Con las secciones traídas de `/landing/`, la portada mezclaba tratos (tú y vosotros), verbos para lo mismo (elegir, marcar, "like"), "web", "página" y "landing", y nombraba criterio.md sin haber dicho qué es.

**Decisión.** En `marketing-site/src/home-copy.ts`, `i18n.ts`, `plans.ts` y `COPY` de `plantilla.html`:
- Castellano de tú en toda la portada, también Tino ("Te pregunto."). Las preguntas van en primera persona.
- Palabras fijas: **referencia** lo que guardas, **landing** lo que construyes, **Criterio** el producto, **criterio.md** el archivo, **elegir / choose** lo que hace el cliente. "Taste" es el gusto, en inglés, y no el producto.
- criterio.md se presenta en el bento ("Cada decisión en un archivo.") y en la primera pregunta.
- El comparador dice "Sin Criterio" y "Con Criterio", como el titular.
- Los planes suman: "Todo lo de Duo" abre Studio y "Todo lo de Studio, para cada cliente" abre Agency, en la web y en la app. Agency es "un criterio.md por cliente".
- Titulares de sección en dos frases, la segunda en gris. Inglés sin coma antes de "and" en las series cortas.

**Por qué.** Alberto, 24-11: "review the whole landing copy in spanish and english and make it cohesive". Las palabras concretas son interpretación nuestra. No se tocan el titular, el castellano de la entradilla, el manifiesto ni lo que se ve en el vídeo, que son textos de Eric.

**Cómo aplicarlo.** Antes de añadir una frase a la portada, busca si ya está dicha en otra sección, y usa las palabras fijas. Los dos idiomas cambian a la vez.
