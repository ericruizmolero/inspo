---
title: El texto de una referencia esconde sus marcas de Markdown, salvo en la línea que se escribe
date: 2026-11-10
status: vigente
kind: diseño
---
**Contexto.** El texto de una referencia abierto en el panel (`components/TextPage.tsx`) se pintaba como en Bear: cada marca (`#`, `**`, `_`, `` ` ``, `>`, `[]()`) se quedaba a la vista, apagada en `--muted`. Los textos que llegan por el MCP vienen con mucho Markdown (negritas al inicio de cada línea, títulos, enlaces) y se leían llenos de asteriscos y almohadillas.

**Decisión.** Las marcas se esconden. `highlightMarkdown` (`lib/markdown-highlight.ts`) envuelve cada línea en `.mde-line` con su número en `data-l` y sigue conservando cada carácter. En `components/TextRef.css`, `.mde-mark` va en `display: none`; solo la línea donde está el cursor (o las que toca la selección) mientras se escribe, `.mde:focus .mde-line.is-active`, las enseña en `--muted` para poder cambiarlas donde están. `TextPage` marca esa línea con `selectionchange` y la vuelve a marcar tras cada redibujo de CodeJar. Siempre se ven el número o el guion de una lista y las casillas de una tarea (`.mde-keep`). La cita lleva una raya de 2 px en `--border-strong` a la izquierda y `---` se dibuja como una línea `--border`.

**Por qué.** Eric, 10-11: "Cuando vienen textos del MCP vienen en un formato con asteriscos y demás muy poco legible. Podemos arreglar todo eso?". Interpretación nuestra: se mantiene la edición en el sitio, como en Obsidian, en vez de separar leer y editar; el Documento de criterio.md (`SystemMarkdown`) ya escondía sus marcas.

**Cómo aplicarlo.** Un texto en Markdown que se lee en la app no enseña sus marcas; si además se edita en el sitio, se enseñan solo en la línea que se está escribiendo. Una marca que forma parte de lo que se dice (número o guion de lista, casilla) se queda.
