---
title: La barra del fichero se queda en cuatro piezas y Copiar guarda las otras salidas
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** La barra de criterio.md tenía seis botones seguidos (Proponer, Comentar, Skills, Copiar, Abrir en…, .md), todos con relleno y contorno de 1 px, y se comían la ayuda de la izquierda. Copiar llevaba `Icons.all`, la rejilla de cuatro cuadrados que es el icono del Tablero. Y el nombre del proyecto quedaba pegado a la Isla. Eric, 06-10: "el icono de copiar hay que cambiarlo", "igual simplificar la fila de botones de alguna forma no?" e "igual que haya más aire entre [el nombre del proyecto] y el navbar no?". Y sobre Proponer, que al pulsarlo no cambiaba nada a la vista: "cuando clickes en proponer entonces que se haya | parpadeando en la primera línea para que se vea que puedes editar no?".

**Decisión.**
- Copiar tiene icono propio, `Icons.copy` (dos hojas solapadas, 16 px, trazo 1,5), en `components/Sidebar.tsx`. También en la barra de receta.md.
- La fila son cuatro piezas: Proponer, Comentar, Skills y Copiar. Copiar es un botón partido (`.mdv-split` en `SystemMarkdown.css`): la mitad izquierda copia de un clic y la flecha (`.mdv-btn--more`) abre el menú del fichero, `FileMenu` (`components/FileMenu.tsx`, antes `OpenInAI`), con "Descargar .md" y "Abrir en un chat" (Claude, ChatGPT, Gemini, en los mismos dos pasos de antes).
- `.mdv-btn` pierde el contorno (`box-shadow: inset 0 0 0 1px`): solo relleno.
- Al activar Proponer, el cursor queda parpadeando al principio de la primera línea editable que se ve en pantalla, sin mover el scroll (`focus({ preventScroll: true })` en `SystemMarkdown.tsx`). La primera versión lo llevaba a la primera área y bajaba la página hasta Tipografía; Eric: "el cursor parpadeante me baja hasta tipografía...". Proponer y Comentar se excluyen: activar uno apaga el otro, también con la tecla C.
- `.spage-head` pasa de 34 a 64 px de margen superior (32 px por debajo de 800 px, donde no hay Isla).

**Por qué.** Las citas de Eric de arriba. La forma concreta es interpretación mía y está pendiente de que la vea en la preview: copiar, descargar y abrir en un chat son tres maneras de sacar el mismo fichero, así que caben en un sitio (principio 17) y la más usada se queda a un clic; un icono que ya significa Tablero no puede significar otra cosa; y el contorno contradecía el principio 4 (botones sin borde).

**Cómo aplicarlo.** Un icono, un significado en toda la app: antes de reutilizar uno de `Icons`, mirar dónde se usa ya. Cuando varias acciones son variantes de la misma (sacar el fichero), la principal queda como botón y las demás van a su flecha, no a la fila. Un modo que cambia lo que hace escribir se nota en el propio texto al activarlo, no solo en el botón. Poner el foco nunca mueve la página: el cursor va a lo que ya se ve. El título de una página respira al menos 64 px por debajo de la Isla.
