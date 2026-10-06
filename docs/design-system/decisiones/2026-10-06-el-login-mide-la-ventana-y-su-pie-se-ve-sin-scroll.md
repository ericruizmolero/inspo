---
title: El login mide lo que la ventana y su pie se ve sin scroll
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** Al añadir bajo el formulario la línea "Al entrar aceptas los Términos y la Política de privacidad", Eric vio que había que bajar para leerla. La página crecía hasta la altura del collage de la derecha, así que el pie del panel quedaba fuera de la pantalla en cualquier ventana.

**Decisión.** En `app/globals.css`, `.auth:not(.auth--solo)` mide `100dvh` con una fila `minmax(0, 1fr)`: el collage se recorta dentro de su columna y el pie (`.auth__foot`) queda siempre a la vista. Si la ventana es más baja que el formulario, hace scroll el panel (`.auth__panel`), no la página. Por debajo de 900 px, sin collage, la página vuelve a crecer con su contenido.

**Por qué.** Eric: "importante hay que hacer scroll para verlos... cuidado". Interpretación mía: una aceptación de términos que no se ve al entrar no sirve como aceptación.

**Cómo aplicarlo.** Lo que una persona acepta al pulsar un botón se lee en la misma pantalla que el botón, sin scroll. Una columna decorativa nunca decide la altura de una página pública.
