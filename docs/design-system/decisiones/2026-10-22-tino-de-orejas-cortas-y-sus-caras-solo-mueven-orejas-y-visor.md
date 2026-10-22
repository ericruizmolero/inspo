---
title: Tino lleva orejas cortas por defecto y sus caras solo mueven las orejas y el visor
date: 2026-10-22
status: vigente
kind: diseño
---
**Contexto.** Tino salía con orejas de cápsula. Las caras de la hoja de copy (skeptic, suspect, smug, admirer, thinker, asleep) se hacían con gestos viejos del motor: la escéptica era `curiosa` (tres lentes y la cabeza girada), la sospechosa `senala`, la satisfecha `aprueba` (que vuelve sola al gesto anterior a los 2 s). El equipo pasó la lámina "Tino · Expressions and voice · v0.1", con el titular "Only the ears and the visor move".

**Decisión.**
- La mascota elegida: orejas cortas (`ears="corta"`, `public/tino/tino-corta.glb`), cuerpo redondo (`bottom="redonda"`), el visor de siempre (`visor="banda"`, `visorStyle="cristal"`), peluche (`material="flocado"`) y blanco (`#F7F5F0`). Es el valor por defecto en `components/Tino.tsx` y en `components/tino/engine.js`.
- Cinco gestos con la forma de la lámina, en `POSES` de `engine.js`: `esceptica`, `sospechosa`, `satisfecha`, `admirada` y `dormida`. Cada uno dice dónde va cada oreja (`ear`, hacia atrás; `tilt`, hacia fuera o hacia la otra) y dos ojos de ascua dentro de la banda abierta (`eyes`, el tamaño de cada ojo). La cabeza no gira: las caras de `moods.ts` miran de frente (`front`).
- `skeptic`, `suspect`, `smug`, `admirer` y `asleep` apuntan a esos gestos en `components/tino/moods.ts`.
- Las caras que no están en la lámina también se separan por las orejas y el visor: `siguiendo` (following: orejas hacia delante y la mirada), `buscando` (searching: una oreja girada y el ecualizador) y `complice` (accomplice: guiña un ojo y las dos orejas se inclinan hacia el mismo lado; antes, un texto que corría por el visor). Antes las tres eran `leyendo` y se veían como el reposo, porque el visor solo enseñaba su contenido en reposo; ahora un gesto con `screen` también lo enseña.
- `thinking` no sigue la lámina: se queda como estaba, `pensando`, con la pantalla del visor que pita (los tres tramos que se encienden uno tras otro, `seg`).

**Por qué.** Alberto: "We keep this as default Mascota elegida: Orejas cortas, cuerpo redondo, visor el que tiene por defecto, material peluche y color blanco". Sobre reposo y leyendo: "they are not very different overall". Sobre el texto del cómplice: "it doesn't have much sense". Sobre pensar: "thinking one should be like we have now, the screen beeping". La lámina: "The face does the punchline, so the line can stay short. Same body every time."

**Cómo aplicarlo.** Una cara nueva es una línea en `POSES` con `ear`, `tilt` y `eyes`, sin `rot`, y su nombre en `moods.ts`. No se gira la cabeza ni se cambia el cuerpo para hacer una cara.
