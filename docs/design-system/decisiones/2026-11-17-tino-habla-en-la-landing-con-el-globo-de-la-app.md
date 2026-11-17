---
title: Tino habla en la landing con el globo de la app
date: 2026-11-17
status: vigente
kind: diseño
---
**Contexto.** En la landing, el bocadillo de Tino (`.say`) era una pastilla mantequilla con sombra suave y sin rabo, distinto del globo de la app. La revisión de gusto del 10-11 quitó bordes, biseles y sombras de toda la landing salvo los controles ([decisión](2026-11-10-los-botones-y-el-campo-de-email-no-se-tocan-en-una-revision-de-gusto.md)).

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro`, todo lo que dice Tino va en el globo de la app (`.cr-balloon`, `components/criterio/criterio.css`): mantequilla, borde de tinta de 1,5 px, radio de 14 px, `--bevel` y rabo de 14 px. Vale para el bocadillo que le acompaña (`.say`), el de las preguntas (`.ask-say`) y el del pie (`.pie-say`); los tres salen de la regla que quita sombras y bordes, como los botones. El rabo apunta a Tino desde donde esté el globo: `placeSay` pone `data-tail` (`down` encima de él, `left` a su lado, `up` debajo) y `--tail-x` con su centro. Mientras escribe, la frase entera ya ocupa su sitio (lo que falta va invisible en `.say-rest`, como `Typed` en la app): el globo no crece ni salta de línea letra a letra. Si se calla a medio escribir, se vacía y se esconde al momento; si ya la dijo entera, se funde con ella dentro. El resto de la landing sigue sin bordes: las etiquetas de las fuentes del paso 1 son de relleno.

**Por qué.** Alberto: "take the text box from the app and use the same".

**Cómo aplicarlo.** Un sitio nuevo donde hable Tino usa este globo, con el rabo hacia él. No hay otro bocadillo.
