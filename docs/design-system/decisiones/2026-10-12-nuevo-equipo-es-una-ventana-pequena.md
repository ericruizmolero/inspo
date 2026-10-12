---
title: Nuevo equipo es una ventana pequeña con una sola frase
date: 2026-10-12
status: vigente
kind: diseño
---
**Contexto.** La ventana de crear un equipo (`components/CreateTeamDialog.tsx`) tenía el ancho de una ventana normal (480), una entradilla de dos frases con punto y coma y el mismo texto en la etiqueta y en el ejemplo del campo ("Nombre del equipo" dos veces). Eric: "mejora diseño de esta card".

**Decisión.** Va en la ventana pequeña de las confirmaciones (`DialogWindow` con `modal--confirm`, 420, la entradilla a 8 del título). La entradilla es una frase corta: "Con su propia librería. Tú serás el propietario." El ejemplo del campo es un nombre de verdad ("Estudio Norte", "Studio North"), no la etiqueta repetida.

**Por qué.** Interpretación: es un paso de un campo, como una confirmación, y las entradillas van escuetas (entradillas escuetas). Un ejemplo que repite la etiqueta no enseña nada.

**Cómo aplicarlo.** Una ventana de un solo campo usa `modal--confirm`. El `placeholder` es un ejemplo, nunca la etiqueta.
