---
title: Resultados es un bento donde cada celda es un resultado, del tipo que sea
date: 2026-10-05
status: retirada
kind: producto
supersedes: La forma de página de bloques de La pestaña Presentación pasa a ser Resultados (05-10)
---
**Contexto.** Resultados era una página de bloques uno debajo de otro, con un hueco abajo para escribir el siguiente y un botón "Añadir". No se veía dónde acababa un resultado y empezaba otro ("cuando empiezas a escribir, ¿qué es el resultado? ¿esa línea? ¿ese párrafo? ¿los bullets de abajo?"), ni cómo se iban a organizar cuando hubiera muchos.

**Decisión.** Resultados es una rejilla (`.res-bento` en `components/ResultsView.css`: cuatro columnas, filas de 148 px, `grid-auto-flow: dense`) y cada celda (`.res-cell`, componente `Cell`) es un resultado: una referencia del proyecto marcada como tal, sea texto, imagen, vídeo, web o post. Lo que tiene imagen ocupa dos por dos (`.is-seen`), un texto largo dos filas (`.is-long`), el resto una celda. Todas enseñan su nombre y unas palabras: las primeras líneas si es un texto, la nota de la referencia si es otra cosa, que se escribe en la propia celda (`onNote`, acción `editNote`). La primera celda es "Nuevo resultado" (`Draft`): un nombre, el texto con Tiptap, imágenes dentro, un enlace pegado solo o una referencia "Del tablero". Pulsar un texto lo abre como página para leerlo y escribirlo (`Page`); pulsar cualquier otra cosa abre su ficha de siempre. El usuario no mueve ni redimensiona celdas.

**Por qué.** Eric: "se puede hacer tipo bento igual... cada bento un resultado, como graphicalui.com". "Y puede ser texto, imagen, vídeo, url... lo que sea". Interpretación nuestra: la celda responde a qué es un resultado (lo que tiene nombre) y a cómo se ven muchos (de un vistazo); y la explicación como campo propio de la referencia vale para todos los tipos, no solo para las imágenes.

**Cómo aplicarlo.** Un resultado es una celda con nombre. Lo que se abre para escribir es solo el texto; lo demás se explica en la celda y se mira en su ficha, sin un sitio nuevo para lo mismo. Los tamaños los decide una regla, no el usuario. Sigue en pie que cada resultado es una pieza del tablero y que `criterio.md` los cita en su sección. Pendiente: ordenar o agrupar cuando haya muchos (por áreas o por entregas), y que el MCP los traiga.
