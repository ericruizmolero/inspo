---
title: Comillas rectas, nunca angulares
date: 2026-11-04
status: vigente
kind: diseño
---
**Contexto.** Los textos en castellano de la app citaban con comillas angulares: Tino ("Andoni en Linear: «…»", "comparten «centrado»"), la búsqueda ("que hablan de «…»"), confirmaciones ("¿Borrar «Nombre»?"), los correos y el criterio.md de marca. Eric, con la captura del globo de Tino: "mejor utilizar " " que «» para evitar AI slop". La skill humanamente, que estábamos valorando para el texto en castellano, pide justo «».

**Decisión.**
- Todo texto que se lee en la app, en los correos y en lo que genera un modelo cita con comillas rectas `"…"`, nunca con `«…»`. Cambiado en `lib/i18n/es/ui.ts` (incluidas las escritas como `«`/`»`), `lib/i18n/es/mail.ts` y `lib/brand-md.ts`; en inglés, también rectas en lugar de `“ ”` (`t.tino.board.talkText`).
- En `lib/area-skills.ts`, la descripción de copywriting dice "con comillas rectas" y la de humanamente "salvo las comillas: rectas, nunca «»": la skill se puede usar, pero esa regla suya no manda.
- La regla vive en el principio 18 (`principios.md`).
- Sin cambiar: `lib/ref-measured.ts` (lee citas en cualquiera de las tres formas), comentarios de código y los ejemplos de la skill "Evitar AI Slop" en `lib/md-skills-more.ts`, que van dentro de cadenas con comillas dobles; se pasan cuando se toque ese fichero.

**Por qué.** Eric: "mejor utilizar " " que «» para evitar AI slop". Interpretación nuestra: las angulares son la marca de un texto pasado por un corrector o por un modelo; en una interfaz suenan a eso, no a una persona escribiendo.

**Cómo aplicarlo.** Un texto nuevo en castellano cita con `"…"` (dentro de una cadena con comillas dobles, escapadas). Una skill externa que pida «» se ofrece con esa regla anulada en su descripción.
