---
title: El pie de Pulido enseña el texto del post y la nota, y cuántas quedan pasa a la pestaña
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** Bajo la tarjeta de delante había una pastilla de una línea con el nombre de la referencia y "Quedan N". En los guardados de X el nombre es el autor más el arranque del post, cortado a 48 caracteres, y muchas veces la imagen sola no dice por qué se guardó: había que abrir la ficha para decidir. Eric lo planteó como duda ("tengo mi debate de si ayudar con el texto escrito/comentario debajo de la imagen").

**Decisión.** En `components/PolishView.tsx` y `.css`, el pie (`.polish__now`) pasa a ser un bloque de cristal:
- Web o imagen: su nombre (`.polish__name`), hasta dos líneas.
- Post de X: una fila (`.polish__say`) con el avatar del autor, su nombre y el texto del post en hasta tres líneas, sin enlaces. Se pide a `/api/post` cuando la tarjeta lleva `POST_WAIT` (300 ms) delante y se guarda para la sesión (`postWords`); mientras llega se lee lo que ya trae el nombre.
- Lo que dijo el equipo, debajo y más apagado (`.polish__say--note`): la nota de quien guardó la referencia o, sin nota, el primer comentario, con la cara de quien lo dijo (`Avatar`, 18 px; caras apiladas en `.polish__faces` si hay más voces). Es `captionFor` de `InspoCard.tsx`, lo mismo que pinta el pie de la tarjeta del tablón. En una referencia de texto no: su nota es el texto de la tarjeta.
- Una nota larga se corta: dos líneas a la vista y `NOTE_MAX` (280) caracteres; entera se lee en la ficha.
- "Quedan N" sale del pie: lo dice la pestaña Pulido de la barra superior (`.topbar__fill` en `InspoClient.tsx`), lo que le queda a cada persona, desde cualquier vista del proyecto. El nombre de la pestaña y su número comparten línea base (`.topbar__label` en `app/globals.css`, también en Sistema): centrado en la pestaña, el número, más pequeño, quedaba alto (Eric: "el número 6 no está bien alineado").
- Sin IA: no se resume ni se explica nada, se enseña lo que ya estaba escrito.

**Por qué.** Eric aprobó la propuesta entera, 06-10: "dale si, me parece bien todo lo que propones". Al verlo pidió las caras: "igual poner si es un comentario globito de quien lo comenta no? no sé algo más enriquecido", y el tope: "cuando el comentario es muy largo igual hay que capar". El razonamiento de la propuesta es mío: sin el texto se decide a ciegas (se conserva todo por si acaso o se sale a la ficha), pero un párrafo por tarjeta convertiría Pulido en leer, de ahí el tope de líneas; y que la IA escriba el porqué contradice que Pulido vaya sin IA.

**Cómo aplicarlo.** En una vista de decidir, el contexto que hace falta va junto a la tarjeta, corto y literal, y lo que dijo alguien lleva su cara. Un número junto a un texto más grande se alinea por la línea base, no por el centro. Los contadores van en la pestaña de su vista, como el 0/8 de Sistema, no junto al contenido.
