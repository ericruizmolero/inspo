---
title: En móvil cada vista empieza por su contenido, no por su cromo
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** La revisión de adaptación del 06-10 (45 rutas a 320, 375, 600, 768, 820, 1024 y 1440 px, y los estados abiertos) no encontró scroll horizontal, pero sí que el móvil era una versión recortada de escritorio: el pie táctil de cada tarjeta del tablón apilaba título, meta, etiquetas y cinco botones en una caja de 42 px y se montaba sobre la tarjeta siguiente; el dock del tablón ocupaba 190 px de 812; en Sistema el documento empezaba en el píxel 545 tras tres filas de chips y tres de herramientas; la ficha no tenía anterior ni siguiente; los modos Tablón, Pulido y Sistema eran tres iconos sin nombre; entre 801 y 1100 px la pastilla derecha tapaba las pestañas de la Isla; y en `/library` una tabla ancha ensanchaba la página entera.

**Decisión.**
- Pie táctil del tablón (`app/globals.css`, `@media (hover: none)` sobre `.board .tile__caption`): una línea con el título en elipsis y los botones; `.tile__meta`, `.tile__tags` y el texto del selector de proyecto (`.tile__go-label`) no se pintan; se leen en la ficha.
- Dock del tablón (`components/GatherBar.css`, ≤640 px): una fila con el título y "Ya tengo las referencias"; miniaturas, entradilla y "Añadir" fuera. Pasa de unos 190 px a unos 105.
- Sistema (`components/SystemDoc.css`, ≤800 px): el índice de áreas es una fila que se desplaza de lado (`.sdoc-toc`) y la barra del fichero otra (`.mdv-bar`), sin la pista de texto; la cabecera pierde margen (`components/SystemView.css`). El fichero empieza en el píxel 268.
- Ficha (`components/ItemPanel.tsx`, `app/globals.css`): en teléfono las flechas `.ip-nav` siguen, de 32 px y de cristal sobre la hoja; un deslizamiento horizontal de más de 70 px pasa a la siguiente o la anterior; un botón `.ip-bar__talk` en la barra baja a la conversación. En ventanas de menos de 500 px de alto la hoja ocupa casi todo (`@media (max-height: 500px)`).
- Barra superior en teléfono: el selector de vista conserva los nombres a 12 px, solo la vista activa enseña su cifra, el logo se va cuando hay selector y el "+" no se encoge; por debajo de 360 px no hay cifras. Conectores vive en el menú.
- Entre 801 y 1100 px la pastilla derecha va solo con iconos (`.topbar__mode` y `.topbar__ext` a tamaño 0) para que las pestañas de la Isla conserven sus nombres, "N más" y "+".
- `/library` (`components/design-library/DesignLibrary.css`): `minmax(0, 1fr)` en vez de `1fr`, para que una tabla ancha se desplace dentro de su caja.
- Login: el pie legal deja 64 px a la derecha para el botón de feedback.

**Por qué.** Eric, 06-10: "en mobile hay que mejorar mucho la UX". Interpretación mía: en una pantalla de 375 px lo que no es el contenido tiene que caber en una línea o desaparecer; lo que se pierde (meta, etiquetas, entradillas) está a un toque en la ficha.

**Cómo aplicarlo.** Toda superficie fija de móvil (dock, barra, índice) se mide en píxeles de la primera pantalla y no pasa de una fila. Un control que en escritorio aparece al pasar el ratón necesita su versión táctil en la misma caja, no apilada debajo.
