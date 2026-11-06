---
title: Las versiones se leen como la historia del equipo, con la cara de cada uno
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** El desplegable de versiones de criterio.md era texto: "v8 · Alberto Gallego, copiado · Cambió: Tipografía, Color, Layout, Motion e interacción, Iconografía, Logo, Imagen, Voz y tono", varias líneas por fila. Eric, con la captura: "potencia el diseño de esto, a alberto le puedes acompañar con su fotito y cosas así. Creo que vamos por buen camino". Y luego: "me mola el tema de versiones y ver lo que ha hecho el equipo".

**Decisión.**
- Cada fila lleva la cara de quien la hizo (`Avatar` 24, foto o inicial en su tono de `toneFor`), y las caras se unen de arriba abajo con una línea de 1 px, como un hilo de historia. Una IA sin persona detrás es un cuadrado chrome con la inicial del cliente.
- Nombre en 600 y cómo salió apagado, en una línea.
- Las áreas cambiadas son sus iconos (14 px, tooltip con el nombre) y un texto corto: nombres hasta dos, luego "N áreas"; "Las 8 áreas" sin iconos cuando cambió todo. Fuera la enumeración larga.
- Versión y hace cuánto a la derecha, en columna, con cifras tabulares.
- El fichero vivo aún sin guardar: el icono del archivo (`file-md`) apagado. Se probó un punto ember que respiraba y Eric lo rechazó: "ese puntito naranja es AI slop".
- La foto sale de cruzar el nombre de la versión con los miembros del espacio; no hay migración.

**Por qué.** Eric quiere ver lo que ha hecho el equipo: la persona primero, el qué en breve. Mismo lenguaje que la Campanita.

**Cómo aplicarlo.** Cualquier lista de lo que ha hecho alguien (versiones, actividad, avisos) lleva la cara de la persona y la frase corta, no un párrafo de etiquetas.
