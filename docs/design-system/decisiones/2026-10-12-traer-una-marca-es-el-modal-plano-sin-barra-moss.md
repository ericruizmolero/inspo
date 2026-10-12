---
title: Traer una marca es el modal plano, sin barra moss, con la web y su botón en una fila
date: 2026-10-12
status: vigente
kind: diseño
---
**Contexto.** "Traer una marca que ya existe" (`components/brand/BrandImport.tsx`, desde el menú ⋯ del Sistema) era una `DialogWindow`: barra moss con "Traer", debajo el mismo título en grande, una entradilla de tres frases, el segmentado de papel en talla m y "Traerla" suelto bajo la pista, lejos del campo.

**Decisión.** Pasa al modal plano: `DialogContent` con `.modal__header` (el título en `t-title-s` y cerrar `IconButton` default s) y `.modal__body`, como Mejorar con IA. Sin barra ni título repetido (la cadena `brand.import.open` se borra). Entradilla de una frase: "Criterio parte de lo que la marca ya tiene y lo sigue mejorando. Lo que edites a mano queda fijo." Las tres formas (Web, Archivos, Guía) en `SegmentedControl` de papel talla s. En Web, el campo y "Traerla" van en una fila (`.bimp__row`, como `.impd__row` de Importar) y la pista debajo; en Archivos y Guía el botón va a la derecha (`.bimp__form > .cr-btn`). `components/brand/brand.css`.

**Por qué.** Eric, 12-10, con la captura de la ventana: "también aqui mejoramos diseño", justo después de "la banda verde out" en el proyecto vacío. Que sea el modal plano y no una tarjeta sale del sistema (interpretación): un formulario va en el modal plano; la ventana moss queda para avisos y confirmaciones. La entradilla se recorta por la regla de [entradillas de una frase](2026-10-06-la-cabecera-de-descubrir-va-en-la-columna-del-contenido.md) (Eric: "tienes que ser mucho más escuetos").

**Cómo aplicarlo.** Un diálogo que pide datos (una URL, ficheros, un texto) es `DialogContent` con cabecera, no `DialogWindow`. Si el campo tiene una sola acción, el botón va pegado al campo en la misma fila. El título no se repite en una barra.
