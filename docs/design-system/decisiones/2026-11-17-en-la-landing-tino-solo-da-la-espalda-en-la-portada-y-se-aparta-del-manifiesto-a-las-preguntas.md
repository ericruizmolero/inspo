---
title: En la landing, Tino solo da la espalda en la portada y se aparta del manifiesto a las preguntas
date: 2026-11-17
status: vigente
kind: diseño
---
**Contexto.** En la portada Tino está de espaldas, mirando el río de referencias. Pero el código lo ponía de espaldas siempre que el progreso de los pasos era 0, y pasados los pasos vuelve a 0: en el manifiesto, el bento y las preguntas seguía de espaldas. Además Tino acompañaba toda la página, también por el manifiesto y el bento, donde decía "They wrote this. I just read it." al llegar.

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro`:
- Tino solo se pone de espaldas (`BACK`) mientras está en la portada (`window.__inScene`); fuera de ella mira de frente (`look(90, -4)`), y al pararse de andar también (`atTop()`).
- Del manifiesto (`#manifiesto`) al bento (`#porque`) Tino se aparta: mientras el centro de la pantalla cae en una de las dos secciones, `.tino` y `.say` llevan `.away`. Vuelve en las preguntas (`#preguntas`) y en el pie le releva el Tino grande, como antes.
- La excepción son las presentaciones del equipo: al pasar por una foto del manifiesto, Tino vuelve, anda hasta ella y presenta a la persona; al irte de la foto se aparta otra vez.
- Una sola función decide si se ve, `away(motivo, on)`, con tres motivos: `quiet` (manifiesto o bento en pantalla), `intro` (presentando a alguien) y `pie` (el Tino grande del pie). Antes lo cambiaban tres bloques sueltos.
- Se quita la frase "They wrote this. I just read it." (ya no está ahí para decirla).

**Por qué.** Alberto: "tino the bunny something it's looking back, this should happen only in the beginning. also when we reach to the section of us (manifesto) we should remove tino until the faqs and the footer". Ante el choque con las presentaciones del equipo, eligió que Tino vuelva solo mientras presenta a alguien, frente a quitarlas o dejarlas como pies de foto.

**Cómo aplicarlo.** En la landing Tino da la espalda solo para mirar el río de la portada. Las secciones que hablan de nosotros y de lo que hace el producto (manifiesto y bento) son sin Tino, salvo cuando él presenta al equipo. Cualquier motivo nuevo para esconderlo entra como otro motivo de `away`, no como otro `classList.toggle("away")`.
