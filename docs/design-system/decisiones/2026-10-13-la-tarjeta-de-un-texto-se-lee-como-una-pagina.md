---
title: La tarjeta de un texto se lee como una página, con letra que crece con la tarjeta y su alto según sus palabras
date: 2026-10-13
status: vigente
kind: diseño
---
**Contexto.** La tarjeta de un texto en el tablón era cuadrada, con las palabras en `--fs-small` y `--text-2` todas seguidas. Con el zoom grande quedaban líneas de unos 90 caracteres, poco contraste y media tarjeta vacía debajo.

**Decisión.** La tarjeta de un texto lleva `.tile__text--page` (`components/TextRef.css`). La letra crece con el ancho de la tarjeta (`cqw`), así cada línea tiene unos 40 caracteres en cualquier zoom. El cuerpo va de 14 a 21 px, en `--text` y con `--lh-body`; el título va de 17 a 36 px. Conserva los párrafos del texto (`paragraphsOf` en `lib/text-excerpt.ts`, `white-space: pre-line`) y nunca parte palabras con guion. El alto de la tarjeta sale de lo largo que es el texto (`textCardRatio`: de 0,62 a 1,4 veces el ancho); lo que no cabe se difumina en el borde, como antes.

**Por qué.** Eric, 13-10, ante la tarjeta "Cómo sería el video promocional": "esta card si es texto tiene que dar gusto leer ya su preview" y "el texto body tiene que leerse mejor con más facilidad".

**Cómo aplicarlo.** Un texto en una tarjeta se compone como lectura: medida de línea estable, contraste de texto principal y párrafos. Los posts de X y las webs sin captura siguen con su `.tile__text` de siempre.
