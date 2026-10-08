---
title: La fila de acciones de la tarjeta son tres botones de icono xs
date: 2026-10-07
status: sustituida
kind: diseño
---

**Contexto.** Sobre la imagen de una tarjeta del tablón, al pasar el ratón, salía la fila `.tile__go` (`components/InspoCard.tsx`): "Archivar" como `Button` s con carpeta y palabras (en tarjetas estrechas, solo la carpeta), la brújula del sistema como `IconButton` strong s y comentarios como `IconButton` default s. Tres alturas y pesos distintos sobre la captura.

**Decisión.** La fila son tres `IconButton` xs (24 px, icono 14), iguales y solo icono, a 6 px: la carpeta (`ProjectPicker`, default; strong una vez archivada), la brújula (`AreaPicker`, strong: la que más importa) y comentarios (default). Las palabras no se pierden: cada botón lleva su `label` (tooltip) con "Archivada en N" o "Al sistema", y la fila del pie de la tarjeta sigue diciendo en qué proyectos está. Se quita la regla de contenedor que escondía las palabras de la carpeta en tarjetas estrechas.

**Por qué.** Eric, 07-10, con la captura de la fila: "estos tres botones tienen que ser más pequeños". Encaja con lo de Alberto del mismo día ("why everything is huge") y con la regla de que en una tarjeta la talla es s como mucho.

**Cómo aplicarlo.** Lo que flota sobre la imagen de una tarjeta es pequeño y uniforme: iconos xs, nunca un botón con palabras junto a botones de icono. Las palabras van al pie de la tarjeta o al `label`.
