---
title: Una tarjeta se borra con dos clics seguidos sobre su papelera
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** Borrar una referencia del tablero pedía tres pasos y dos viajes del puntero: abrir el menú de los tres puntos, elegir "Quitar de criterio.design" y pulsar "Borrar" en una barra que se convertía entera en la pregunta, con su texto y una X para cancelar. Además, un segundo clic antes de 400 ms no contaba, así que un doble clic no borraba.

**Decisión.** La papelera está a la vista en la barra de la tarjeta, como último botón de `.tile__actions` (`components/InspoCard.tsx`). El primer clic la convierte en la palabra "Borrar" en rojo (`.tile__action--confirm` en `app/globals.css`), que crece hacia la izquierda y se queda bajo el puntero; el segundo clic borra. Un doble clic son esos dos clics. Lo cancelan Esc, sacar el puntero de la tarjeta o 6 s sin hacer nada. La X, el texto de la pregunta, el aro rojo de la barra y la guarda de 400 ms desaparecen; solo se descarta la repetición de una tecla mantenida. El menú de los tres puntos queda para la miniatura (subir, reemplazar, quitar) y no sale en imágenes ni textos, que no la tienen. En táctil es la misma papelera del pie de la tarjeta con dos toques. Las cadenas `card.removing` y `card.confirmRemove` salen de `lib/i18n/{en,es}/ui.ts`.

**Por qué.** Eric: "que borrar elemento del tablero sea algo más facil, doble click si pero algo más sencillito". La forma concreta es interpretación mía y está pendiente de que la vea en la preview: los dos clics siguen siendo la confirmación que pide el principio 14, pero ocurren en el mismo sitio y sin leer nada; y al sacar el borrado del menú deja de haber dos caminos para lo mismo (principio 17).

**Cómo aplicarlo.** Lo que se borra de una tarjeta o de una fila se confirma en el propio botón, que cambia a la palabra en rojo donde ya está el puntero, y se cancela solo al irse. `useConfirm` (el diálogo) se reserva para lo que arrastra más cosas, como borrar un proyecto. El borrado de una referencia no se puede deshacer: si un día se añade "Deshacer", el segundo clic sobra.
