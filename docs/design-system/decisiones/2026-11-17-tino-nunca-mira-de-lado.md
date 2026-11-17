---
title: Tino nunca mira de lado, te mira a ti o a la pantalla
date: 2026-11-17
status: vigente
kind: diseño
---
**Contexto.** En la landing Tino giraba la cabeza de lado en varios momentos: al presentar a alguien del equipo miraba la foto (`lookRaw(150)`), al andar miraba hacia donde iba (`138` o `42`), al entrar en la portada miraba a un lado (`look(12)`), al importar seguía cada casilla (`yawTo`) y el Tino grande del pie miraba de lado al aparecer (`B.look(138)`).

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro` Tino solo tiene dos direcciones: de frente, a ti (`90`), o en la portada de espaldas, mirando la pantalla con el río (`BACK`, 270). Presenta al equipo mirándote, anda mirándote, entra mirándote, el motor se crea mirando al frente (`look: [90, 0]`) y el Tino del pie también. Sale `yawTo`. Lo que sigue al puntero es el motor (`track`), que gira la cabeza hacia tu cursor: eso es mirarte a ti y se queda.

**Por qué.** Alberto: "when criterio talks something it's not looking at you" y luego "never ever tino has to look to the side, always front or the screen".

**Cómo aplicarlo.** Cualquier `look`, `lookRaw` o `B.look` nuevo usa `90` o, solo en la portada, `BACK`. Si Tino habla, te mira.
