---
title: La interfaz suena solo en lo que decide algo, con cuelume en su tema press, y arranca callada
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** La app tenía música (`SoundControl`), pero ninguna acción sonaba. Alberto pidió añadir los sonidos de cuelume (cuelume-site.pages.dev), una librería de 6 kB que sintetiza catorce sonidos de interfaz con Web Audio, sin ficheros.

**Decisión.**
- Un solo módulo, `lib/ui-sounds.ts`: `cue(sonido, opciones)` suena solo si la persona los encendió; `setUiSounds` y `useUiSounds` los encienden y los leen. Tema `press` para todo. Nadie importa `cuelume` directamente.
- Apagados por defecto. Se encienden en Ajustes, Cuenta, Apariencia, fila Sonidos (`Switch`), y se recuerdan en este navegador (`inspo:ui-sounds`). Al encenderlos suena `toggle`, para oír cómo son.
- Suenan solo los momentos que deciden algo, no cada botón ni cada tecla. Ningún `data-cuelume-*` ni `bind()`.
  - Guardar una referencia (por URL, imagen o texto): `success` sutil, en `InspoClient.tsx`.
  - Pulido: Conservar es `select` hacia delante, Olvidar `select` hacia atrás, deshacer `navigate` hacia atrás, cerrar el pulido `success` (`PolishView.tsx`).
  - Sacar una carta de un proyecto al Inbox: `select` hacia atrás, como Olvidar (`InspoCard.tsx`).
  - El aviso de error del tablero (`toast--error`): `error`.
- Va aparte de la música: la música es ambiente y se elige en la pastilla de la esquina; esto es respuesta a una acción y se elige en Ajustes. Ninguno enciende el otro.
- `Switch` dentro de un `FieldRow` ya no se estira (`.cr-fieldrow-line>.cr-switch`).

**Por qué.** Alberto, 07-10, al elegir entre opciones: pocos momentos clave antes que todos los botones, apagado por defecto con interruptor en Ajustes, y el tema `press`. Interpretación nuestra: es la misma regla que la música ("nada empieza a sonar sin un clic"), y un sonido en cada botón deja de decir nada.

**Cómo aplicarlo.** Un sonido nuevo pasa por `cue` de `lib/ui-sounds.ts`, nunca por `play` de cuelume. Solo suena lo que cambia el sitio de una cosa o cierra una decisión: guardar, decidir, deshacer, fallar. Lo mismo suena igual en todas partes (sacar al Inbox suena como Olvidar). Abrir, navegar, escribir y pasar el ratón no suenan.
