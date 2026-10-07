---
title: Vuelve Pulido como fase entre el Tablón y el Sistema, a mano y sin IA
date: 2026-10-06
status: vigente
kind: producto
supersedes: Pulir y Organizar retirados (04-10), solo en lo que toca a que no hubiera una fase de pulido; los juegos de criba con IA siguen retirados
---
**Contexto.** Pulir (baraja de duelos, duplicados y tono, con criba de un modelo) se retiró el 04-10 porque el Sistema ya elegía qué respalda cada área. Desde entonces del Tablón se pasaba directo al Sistema, con todo lo que se hubiera guardado.

**Decisión.** Entre Tablón y Sistema hay una tercera pestaña, **Pulido** (`?view=polish`, `components/PolishView.tsx` + `PolishView.css`, prefijo `.polish`). El tablón entero gira como un tornado 3D de tarjetas (la matemática del "3D cards tornado" de Osmo Supply, portada a `requestAnimationFrame`, sin GSAP y ventaneada: solo se montan las tarjetas cercanas a la pantalla). La tarjeta de delante es la que se decide con dos botones del mismo peso: **Conservar** (se queda en el tablón) y **Olvidar** (sale del proyecto y vuelve al Inbox, nunca se borra). Deshacer devuelve la última. Un botón de **Sonido** activa una pista opcional (`public/polish/ambient.mp3`, "Laundry On The Wire" de HoliznaCC0, CC0) que no se descarga hasta que se enciende. Lo conservado se recuerda en el navegador por proyecto (`inspo:polish-kept:<id>`); con todo decidido, el tornado gira solo y se ofrece "Ir al sistema". "Ya tengo las referencias" (`GatherBar`) sigue llevando siempre al Sistema (Eric, 06-10: "El ya tengo las referencias te lleva siempre a Sistema"); a Pulido se entra por su pestaña, y su "Ir al sistema" hace lo mismo que ese botón.

**Por qué.** Eric, 06-10: "entre la fase de tablero y sistema vamos a añadir la fase de pulido. Viene inspirado como la fase de Serendipity de My Mind. Donde te aparece un slider donde puedas activar sonido mindfulness y puedes ir viendo todo tu tablero e ir clickando a forget, keep". Interpretación nuestra: Olvidar devuelve al Inbox (y no borra) porque es lo que ya significa sacar algo de un proyecto en el resto de la app; y lo conservado se guarda en el navegador, no en la base de datos, hasta que se decida si el pulido es de cada persona o del equipo.

**Cómo aplicarlo.** Pulido es un repaso a mano, tranquilo: no añadirle criba de un modelo, puntuaciones ni juegos sin una decisión nueva. Olvidar se dice siempre como lo que es (vuelve al Inbox). El tornado no lleva GSAP: sus parámetros (ángulo, separación, órbita, niebla y desenfoque del fondo) están como constantes al principio de `PolishView.tsx` con los nombres de Osmo. La música pasó el mismo día de una pista a seis, elegidas por nombre: ver [la música de Pulido se elige por nombre](2026-10-06-la-musica-de-pulido-se-elige-por-nombre.md).

**06-10, más tarde.** Cómo se ve y cómo se decide cambió el mismo día con las pruebas de Eric: la tarjeta sale del tornado, el resto gira solo y lo decidido vuela a su pestaña. → [decisión](2026-10-06-en-pulido-la-tarjeta-decidida-vuela-a-su-pestana.md)
