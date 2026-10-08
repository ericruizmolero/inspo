---
title: El compositor de comentarios enseña su mini ayuda
date: 2026-10-07
status: vigente
kind: diseño
---

**Contexto.** El compositor de la ficha (`components/CommentsPanel.tsx`) tenía hasta ayer una línea de ayuda en su pie: "↩ envía, ⇧↩ salto de línea, ⌘V pega capturas". Al pasar al `TextArea` del sistema con barra, la ayuda quedó solo para lectores de pantalla (`cr-visually-hidden`) y la barra se quedó con el clip y Enviar.

**Decisión.** La ayuda vuelve a verse, debajo del campo y fuera de la caja: `.cm-composer__keys` (tamaño label, `--chrome-muted`), una línea entera que puede partirse. Se probó dentro de la barra, entre adjuntar y Enviar, y Eric la paró: allí se cortaba con puntos suspensivos y estorbaba ("cuidado dónde ponemos los textos de ayuda, que no se leen bien y entorpecen"). Mientras sube una captura, la barra dice "Subiendo captura…" (`.cr-textbox-status`). La ayuda sigue siendo el `aria-describedby` del textarea.

**Por qué.** Eric, 07-10: "antes aquí en comentarios de cada ficha teníamos una mini ayuda para que supieses cómo adjuntar imagen y demás, eso podemos rescatar?". Interpretación: que se pueda pegar una captura no se descubre solo; el placeholder lo insinúa pero la ayuda lo dice.

**Cómo aplicarlo.** Los textos de ayuda van donde se leen enteros y no compiten con los controles: debajo del campo, nunca apretados entre botones ni recortados. Los atajos de teclado y las formas de adjuntar van ahí, no en un tooltip ni solo en el placeholder.
