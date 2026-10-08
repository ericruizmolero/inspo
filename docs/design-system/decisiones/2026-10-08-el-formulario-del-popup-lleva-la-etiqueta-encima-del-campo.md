---
title: El formulario del popup de la extensión lleva la etiqueta encima de cada campo, no dentro
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** En el popup de la extensión (`extension/chrome/popup.html`, `popup.css`), la nota era un área de texto sin etiqueta con un placeholder de tres líneas ("¿Qué te ha llamado la atención? Un sonido, una transición, el menú… (opcional)") que no cabía en las dos líneas del campo, y el proyecto era un campo con la etiqueta "Proyecto" dentro, a la izquierda, y el nombre del proyecto alineado a la derecha y cortado ("Rediseño de home · Multive…"). Eric, 08-10, con una captura: "las 2 áreas que están ahí de qué te ha llamado la atención y proyecto se tiene que mejorar el diseño, en la primera ni se lee todo el placeholder".

**Decisión.** Cada campo del formulario va como el `TextField` del sistema: una etiqueta pequeña y apagada encima del pozo (`.field`, `.field__label`: 12 px, `--chrome-text-muted`), nunca dentro. Nota ("Nota", `noteLabel`) con el placeholder de una línea, el mismo que Añadir en la app ("¿Qué te ha llamado la atención? (opcional)", `noteHint`), a 14 px y dos líneas de alto. Proyecto ("Proyecto") con el nombre a todo el ancho, leído desde la izquierda, a 14 px (`.select--plain`); la flecha en apagado. Las áreas llevan su etiqueta ("Áreas del sistema") encima de las pastillas. El `.select` con etiqueta dentro sigue en la pestaña de importar (Espacio, Proyecto, Cuáles), que no cambia. Versión 0.7.1 de la extensión.

**Por qué.** Lo pidió Eric con las palabras de arriba. Interpretación nuestra: un placeholder es una ayuda, no un texto que leer, así que cabe en una línea y lo demás lo dice la etiqueta; y un nombre de proyecto se lee entero desde la izquierda, no recortado a la derecha de su etiqueta.

**Cómo aplicarlo.** En la extensión, un campo nuevo es `.field` (etiqueta encima) con su pozo (`.input`, `.select--plain`); el placeholder dice una cosa y cabe en una línea; el texto de la persona o el nombre elegido ocupa el ancho entero del campo. Las cadenas van en `_locales/{en,es}/messages.json` a la vez.
