---
title: Importar pregunta primero dónde va, y el Inbox siempre es una opción
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** En la página de importar de la extensión, el Inbox solo salía cuando el espacio no tenía proyectos, y al abrirla desde "Guardados de X" bajaba directa a la sección de X, con la cantidad a mano y el destino arriba, fuera de la vista. Eric: "en la extensión de X que puedas guardar en el inbox también, no solo en proyectos", "que siempre te pregunte dónde antes incluso de elegir la cantidad".

**Decisión.**
- El campo Proyecto de "Dónde va" (`extension/chrome/import.html`, `import.js`) lleva siempre **Inbox** como primera opción, y después los proyectos; viene elegido el último proyecto usado, como antes.
- "Dónde va" termina en un botón **Usar este destino**. Hasta pulsarlo, los controles de X (cuáles e importar, en `fieldset.step`) y el botón de los marcadores del navegador están apagados, con la línea "Primero elige dónde va, arriba." en ember. Al pulsarlo, los campos se pliegan a la frase del destino con **Cambiar**, y la página baja a la fuente desde la que se abrió.
- Abierta desde X o los marcadores, la página se queda en "Dónde va" con el foco en Proyecto. Un tablero no espera: va al proyecto con su nombre.
- Elegir Inbox lo deja en el Inbox de verdad: la extensión manda `inbox: true` y `addMany` (`lib/add-many.ts`) no lo archiva. Antes, sin proyecto, todo lo nuevo iba al último proyecto en el que trabajó la persona, y la prueba de Eric (50 posts de X "al Inbox") acabó en un proyecto. Sin la marca (una extensión vieja) sigue como antes.
- Al terminar, "Abrir la librería" y "Abrir el proyecto" van al espacio donde se importó: `/w/<espacio>?in=inbox` y `/p/<proyecto>?view=board`, que hacen activo ese espacio primero. Eric: "cuando le das a abrir librería no te va a la librería que has escogido".
- La confirmación de antes de importar sigue igual. Extensión 0.9.3.

**Por qué.** Eric lo pidió con esas palabras. Interpretación nuestra: el destino es lo único que no se puede deshacer fácil después de importar cientos de posts, así que va primero y a la vista.

**Cómo aplicarlo.** Una fuente nueva que use el proyecto elegido mete sus controles en un `fieldset.step` que abre `lockSteps`. Una que decida su propio proyecto, como un tablero, no espera.
