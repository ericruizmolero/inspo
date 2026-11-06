---
title: La ficha en móvil no tiene botón de comentarios; la conversación asoma debajo
date: 2026-11-06
status: vigente
kind: diseño
supersedes: 2026-10-06-en-movil-cada-vista-cabe-en-la-primera-pantalla (solo el botón `.ip-bar__talk` de la ficha)
---
**Contexto.** Desde el 06-10, en teléfono la barra de la ficha llevaba un botón con el icono `comment` (`.ip-bar__talk`) entre "Copiar enlace" y "Cerrar" que bajaba con scroll hasta la conversación, colocada debajo de la referencia. Eric, al verlo: "el boton de comentarios dentro de la ficha creo que no tiene mucho sentido no?".

**Decisión.** Fuera el botón: se quitan el `IconButton` y su `toThread` (con el `bentoRef` que solo usaba él) de `components/ItemPanel.tsx`, y las reglas `.ip-bar__talk` de `app/globals.css`. La barra de la ficha queda con fuente, títulos, pestañas, "Copiar enlace" y "Cerrar". La conversación se alcanza con scroll: el escenario mide `70svh`, así que el hilo ya asoma por debajo en la primera pantalla.

**Por qué.** Junto a "Copiar enlace" y "Cerrar", un bocadillo se lee como "comentar" o "abrir comentarios", no como "ir abajo" (interpretación nuestra, Eric dio el sí: "dale si"). Además, si la conversación ya asoma bajo la referencia, el atajo no aporta nada.

**Cómo aplicarlo.** En la barra de una hoja o ficha, cada icono hace lo que su icono promete. Para llevar a contenido que está más abajo basta con dejar que asome; no hace falta un botón de salto.
