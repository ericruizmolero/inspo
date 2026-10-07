---
title: Las dos filas de la tarjeta llevan los mismos botones de icono s, y la carpeta archivada es ember
date: 2026-10-07
status: vigente
kind: diseño
supersedes: decisiones/2026-10-07-la-fila-de-acciones-de-la-tarjeta-son-tres-iconos-xs.md
---
**Contexto.** Esta misma mañana la fila de abajo de la tarjeta (`.tile__go`, `components/InspoCard.tsx`) pasó a tres `IconButton` xs: carpeta strong si estaba archivada, brújula strong, comentarios default. Arriba a la derecha (`.tile__actions`) seguían tres default s: abrir, más y papelera. Dos tallas y tres pesos en la misma tarjeta, y la carpeta había perdido el naranja que tenía cuando era un `Button` primary.

**Decisión.** Las dos filas llevan la misma pieza: `IconButton` default s (32 px, icono 16), a 6 px, arriba y abajo. La única nota de color de la tarjeta es la carpeta cuando la referencia ya está en un proyecto: `.tile__go .cr-iconbtn.is-filed` pinta el botón con `--ember` y `--on-ember` (hover `--ember-glow`), en `app/globals.css`. La brújula deja de ser strong: su estado se dice con `is-active`, no con otro peso. Las palabras siguen en la fila del pie y en el `label` de cada botón.

**Por qué.** Eric, 07-10, con la captura de una tarjeta: "me gustaba antes que la carpeta tenía color naranja. Hay que homogeneizar un poco los tamaños de todos los botones. Me gustan los 3 de arriba a la derecha. El resto homogeneizamos". Interpretación nuestra: en una tarjeta, una sola pieza repetida se lee como un conjunto; el color se gasta en lo único que cambia de estado, estar archivada.

**Cómo aplicarlo.** Lo que flota sobre la imagen de una tarjeta son `IconButton` default s, todos iguales, arriba y abajo. Ni xs ni strong para destacar uno: si algo tiene que llamar, lleva ember por estado (`.is-filed`), no otra talla ni otro relieve.

**Matiz (07-10, más tarde).** Misma talla arriba y abajo, pero no la misma forma: los tres de abajo van en cuadrado redondeado (`.tile__go .cr-iconbtn { border-radius: var(--radius-md) }`), como el antiguo "Archivar"; los tres de arriba siguen redondos. Eric: "los tres de abajo a la izquierda sí que pueden ir en rectángulo/cuadrado como teníamos antes, pero ese tamaño está bien". Y la pieza es la retro: `IconButton` strong (papel, borde ink, bisel), no default, en los tres; la carpeta archivada pone ember bajo ese mismo bisel, como el antiguo `Button` primary. Eric: "puedes poner esos 3 con el botón tipo retro que tenía una especie de sombreado; el tema era el tamaño". Arriba a la derecha siguen default y redondos.
