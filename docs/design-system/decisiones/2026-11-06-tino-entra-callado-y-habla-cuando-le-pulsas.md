---
title: Tino entra callado en cada vista y habla cuando le pulsas
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Al entrar en una vista, Tino abría su globo solo con el primer aviso ("Yo no digo nada. 126 referencias en el Cajón…"). Eric: "de primeras en la primera view Tino tiene que estar sin hablar". Entre que hablara tras un rato, tras el primer gesto o solo al pulsarle, eligió solo al pulsarle, en todas las vistas.

**Decisión.**
- `HomeTino` (`components/HomeTino.tsx`) ya no abre el globo de los avisos por su cuenta en ninguna vista (Inicio, tablón, Cajón, Sistema): `pending` es solo `asked`. Con avisos pendientes pone cara de `watching`; sin nada, `asleep`. Al pulsarle dice el primero, con "2 de 4 ›" para pasar.
- Siguen llegando solos: lo que responde a la persona (`speak`: una búsqueda, una edición), lo que ha empezado (`say`: el nombre de un proyecto, algo guardándose) y el respiro tras 40 minutos activos.
- Pulido no cambia: allí Tino es quien pregunta por la carta.
- De paso, Tino está entero en su esquina: la caja de 140 px se apoya en el borde y el peluche queda a 16 px de él, lo mismo que la pastilla de la música a la izquierda (Eric: "un poco más arriba dejando el mismo espacio que deja a la izquierda los elementos de música con el bottom de la página"). Antes asomaba cortado por el borde.

**Por qué.** Que hable nada más entrar interrumpe; lo que tiene que decir sigue ahí, a un clic.

**Cómo aplicarlo.** Un aviso nuevo no se enseña solo: entra en la lista y espera a que pulsen a Tino. Solo puede salir por su cuenta lo que contesta a algo que la persona acaba de hacer.
