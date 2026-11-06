---
title: La tarjeta de un tuit sin imagen mide lo que sus palabras, como la de un texto
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Un post de X sin foto ni vídeo se pintaba en el tablón como un cuadrado (`.tile__text--post`, relación 1:1). Un tuit de cinco líneas dejaba media tarjeta vacía debajo, mientras que un texto pegado ya ajustaba su alto a sus palabras ([decisión](2026-10-13-la-tarjeta-de-un-texto-se-lee-como-una-pagina.md)).

**Decisión.** La tarjeta del tuit mide lo que su cabecera (cara, nombre, @handle) y sus palabras, más el mismo aire abajo que arriba. Se mide en el navegador a su ancho real (`usePostFit` en `components/InspoCard.tsx`), porque su letra no crece con la tarjeta como la de un texto y contar caracteres fallaría. Va de 0,45 a 1,4 veces el ancho; hasta medirlo es cuadrada. Si el tuit no cabe en 1,4, sus últimas líneas se difuminan (`.is-cut`), como antes.

**Por qué.** Eric, 06-11, ante un tuit con media tarjeta vacía: "los tuits escritos que se adapten al tamaño de caja como se adapta cuando subes un copy".
