---
title: El manifiesto son siete frases centradas que se encienden palabra a palabra, con lo que nombran puesto entre las palabras
date: 2026-11-24
status: vigente
kind: diseño
supersedes: En el manifiesto Tino escribe con guion y deja detalles escondidos (2026-11-23)
---
**Contexto.** El manifiesto de la portada (`#mf`) se escribía en mono, letra a letra, en nueve párrafos: unas tres pantallas de negro con el texto pequeño.

**Decisión.** `marketing-site/src/components/HomeManifesto.astro`, con su texto en `home-copy.ts` (`manifesto.lines`):
- Siete frases centradas en la serif (`clamp(24px, 2.6vw, 38px)`), como el de `/landing/`. Cada palabra pasa de 0,2 a 1 de opacidad con el scroll (`--k`). Sin JavaScript se lee entero.
- Lo que nombran va entre las palabras: pastillas lisas con dibujo ("una tarde" en butter, "tuya" con Tino en ember, "olvida" tachada, "manos" en lila con el cursor en píxeles) y, de los detalles de Eric, la pila de referencias, "gigante" en grande, "hover" que se ilumina, Alberto que cambia "diez" por "cien", la versión v7 y la sonrisa que gira. La firma es un trazo de boli de ida y vuelta bajo la palabra, no un garabato.
- Se quita el motor de escritura (guion de pasos, `.mf-cur`, `.tc`, `.ty`) de `plantilla.html`. La ventana que crece, el paso a oscuro y lo que dice Tino de cada cara siguen allí. La barra dice `why-it-exists.md` / `por-que-existe.md`.
- La altura es fija desde el principio: solo cambian opacidades.
- El Tino grande del cierre ya no habla: ni al pasar por encima, ni al pulsarlo, ni al arrastrarlo.
- El héroe respira: `padding-top: clamp(44px, 8.6svh, 92px)` bajo la cabecera y más aire hasta el formulario y la ventana. La casilla de Acepto va centrada en escritorio, como en el cierre.

**Por qué.** Alberto, 24-11: "make the manifiesto something more compact like this and the previous manifesto in /landing" (con una referencia de frases grandes con palabras en pastillas), "signature it's a bit shitty", "we are missing some good parts of the manifesto we had", "remove the message of tino in the footer", "give some space between header and hero" y "do the same as in the footer to center the check".

**Cómo aplicarlo.** Una frase nueva cabe en dos líneas y lleva como mucho tres cosas entre las palabras. La puntuación que sigue a una pastilla va en `after`, para que no empiece línea. Ninguna frase parecida a las de human-md.ai.
