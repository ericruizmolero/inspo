---
title: Olvidar es un toque, las flechas se ven, y Tino nunca dice "campeón"
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** En Pulido, Olvidar preguntaba antes ("¿Seguro, seguro?" con "Olvidar igualmente" y "Me la quedo") si la carta tenía comentarios o era tu idea, una vez por semana con "¿Seguro, campeón?". En el Cajón casi todo es tuyo, así que preguntaba cada vez, y ← se paraba en la misma pregunta. Eric: "aquí que el olvidar sea un toque", "y que si haces click en -> y <- que tambien funciona", "el 'campeon' no quiero que esté", "Tino es majo y agradable. nunca 'campeon' como chulo", y al verlo aún en un proyecto: "sigue habiendo un doble paso para olvidar eso no...", "y poner de alguna forma ayuda al usuario para que sepa que se puede hacer con las arrows del ordenador".

**Decisión.**
- Olvidar y ← no preguntan nunca, en ningún pulido (Cajón, proyecto solo o en equipo): la carta se va a la primera. Deshacer y ⌘Z siguen debajo. Fuera de `PolishView.tsx` el estado `sure` y su globo; fuera de `lib/i18n/{en,es}/ui.ts` `sure`, `sureComments`, `sureOwn`, `sureOwnInbox`, `keepIt`, `forgetAnyway`, `afterForget`, `afterKeep` y `sureChamp`.
- ← olvida y → conserva (comprobado con sesión en el Cajón: 1 / 126 → 2 / 126 → 2 / 125). Con la ficha de una carta abierta las flechas no hacen nada, a propósito.
- Las flechas se ven: dentro de Olvidar y Conservar, en lugar del icono de flecha, su tecla plana (`Key` con `.polish-tino__key`: sin fondo ni bisel, línea al 28 % del color del texto, como el "/" del buscador), y `aria-keyshortcuts` en cada botón.

**Por qué.** Lo olvidado se deshace con un toque: preguntar era fricción. Y la voz: Tino es majo y agradable, nunca chulo ni condescendiente (palabras de Eric). Lo de la tecla plana en vez de un texto de ayuda es interpretación nuestra: enseña el atajo donde ya se mira, sin una línea más.

**Cómo aplicarlo.** Ninguna frase de Tino trata a la persona por encima del hombro: nada de "campeón", "crack", "figura", "jefe" o "listillo". Puede ser irónico con la situación, nunca con la persona. Un botón con atajo de una tecla lleva la tecla dentro, plana.
