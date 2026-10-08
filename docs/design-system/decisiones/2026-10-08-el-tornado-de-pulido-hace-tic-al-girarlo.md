---
title: El tornado de Pulido hace tic al girarlo con la mano
date: 2026-10-08
status: vigente
kind: diseño
---
**Contexto.** Los sonidos de la interfaz suenan solo en lo que decide (Conservar, Olvidar, deshacer, cerrar el pulido, guardar, error) y, desde hoy, en lo nuevo del equipo. Girar el tornado de Pulido con el scroll o arrastrando era mudo.

**Decisión.** Cada carta que pasa por delante mientras la persona gira el tornado hace un `tap` sutil por `cue`, como la muesca de una rueda, con un mínimo de 70 ms entre dos para que un giro rápido sea un ronroneo y no un traqueteo. No suena cuando el tornado se coloca solo tras una decisión (eso ya tiene su sonido) ni cuando gira detrás de las palabras con el tablón terminado. Eric: "el spin de tornado veo que no tiene sonido de sistema, igual lo ponemos no?".

**Por qué.** El giro lo mueve la mano y el oído espera la respuesta; con los sonidos apagados (el arranque callado sigue) no cambia nada.

**Cómo aplicarlo.** Un movimiento continuo que conduce la persona puede marcar sus pasos con `tap`; lo que se mueve solo, no. Siempre con un mínimo entre ticks.
