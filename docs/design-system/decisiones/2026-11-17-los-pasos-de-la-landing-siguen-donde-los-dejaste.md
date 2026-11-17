---
title: Los pasos de la landing siguen donde los dejaste
date: 2026-11-17
status: vigente
kind: desarrollo
---
**Contexto.** En los pasos de la landing, una sola ventana viva va a la sección que más ocupa la pantalla y las demás enseñan una copia quieta. Al pasar de "Keep what matters" a "Hand it to your agent" había un salto: si dejabas un paso a medias, su copia volvía a su principio de golpe; al volver, el paso empezaba otra vez; y el globo de Keep y Forget, que va con Tino en su capa fija, seguía en pantalla sobre el paso siguiente.

**Decisión.** En `marketing-site/src/pages/index.astro` y `es/index.astro`: al salir de un paso a medias, su copia pasa a ser lo que la ventana enseñaba en ese momento (`holdSnap`, la misma que usa `keepEnd` al acabar) y se guarda por dónde iba (`segAt`); al volver sigue desde ahí. El globo de Keep y Forget solo se ve mientras la ventana viva está en "Keep what matters" (`act === 1`).

**Por qué.** Alberto: "the animations of different sections are not fluid, sobre todo en «Hand it to your agent» and «Keep what matters»… there is like a tiny jump between them".

**Cómo aplicarlo.** Lo que enseña una sección no cambia porque la ventana viva se vaya a otra. Lo que pertenece a un paso (un globo, un rótulo) solo se ve con ese paso.
