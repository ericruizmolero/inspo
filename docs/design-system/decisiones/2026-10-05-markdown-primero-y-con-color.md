---
title: criterio.md se abre en Markdown, con el color de un editor
date: 2026-10-05
status: vigente
kind: diseño
---
**Contexto.** Al pasar el Sistema a presentación de marca (ce9df07f) se borró `SystemStage.css` y con él la regla `.mdv` que daba color al Markdown: quedó todo en blanco sobre negro. Después (3d6f68e7) el fichero pasó a abrirse en la vista Documento.

**Decisión.** El Markdown vuelve a ser la primera pestaña y vuelve a tener el aspecto de antes: panel oscuro en los dos temas, mono a 13 px, títulos en azul (`--md-head: #79b8ff`), citas en verde (`--md-quote: #7ee787`), negritas en blanco. Las reglas están ahora en `components/SystemMarkdown.css`.

**Por qué.** Eric: "haz que el markdown como tal tenga aspecto styles.refero.design más amigable", "como teníamos antes", "y haz que el markdown sea lo primero que ves, no el documento". El MD es lo que lee un agente y lo que se copia; se enseña tal cual, como en styles.refero.design.

**Cómo aplicarlo.** Al mover o borrar CSS del Sistema, comprobar que `.mdv` sigue definiendo sus variables `--md-*`; la vista Documento las redefine en `.mdv--doc`.
