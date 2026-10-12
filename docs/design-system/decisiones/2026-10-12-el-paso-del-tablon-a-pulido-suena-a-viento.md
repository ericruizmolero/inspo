---
title: El paso del Tablón a Pulido suena a viento
date: 2026-10-12
status: vigente
kind: diseño
---
**Contexto.** Las tarjetas del tablón vuelan al tornado con la curva de viento (`EASE_WIND`) y el cambio era mudo. Eric: "haz que suene viento al cambiar de tablon a pulido, tenemo sonido?".

**Decisión.** Cuando las tarjetas del tablón empiezan a volar al tornado suena `gust` de `lib/ui-sounds.ts`, llamado desde `settleFromBoard` en `components/polish-tornado.ts` con la duración del vuelo más el escalón de la última tarjeta. cuelume no tiene viento ni deja usar su `AudioContext`, así que es un sonido propio sintetizado con Web Audio, sin ficheros: ruido suave por un filtro de banda cuyo volumen y tono siguen la velocidad de `EASE_WIND` (muestreada en 48 pasos con `setValueCurveAtTime`), con volumen máximo `WIND_VOLUME` 0,06, de izquierda a derecha. Respeta el interruptor de Sonidos de Ajustes; en la librería se oyen los dos con `force`. De vuelta, de Pulido al Tablón, suena `gust(MORPH_MS, { back: true })` desde el efecto que hace volar las tarjetas en `components/Grid.tsx`: el viento amaina, más grave, al 80 % del volumen y de derecha a izquierda, con la misma curva de velocidad.

**Por qué.** Lo pidió Eric. La primera versión sonaba en el clic, con volumen 0,32 y una forma fija; Eric: "suena demasiado, tiene que se mas suave y sincronizado con el movimiento". Que la forma del sonido siga la del vuelo (crece cuando las tarjetas van más rápido y se apaga cuando se posan) es interpretación mía, para que el oído y la vista cuenten lo mismo.

Al Sistema y desde él (ver [destilar](2026-10-12-a-y-desde-el-sistema-la-vista-se-destila.md)) suena en el clic: salir es el viento que amaina; entrar, `gust(ms, { bright: true })`, un viento más agudo (700 a 2800 Hz). Eric pidió "más agudo como de gusto como de resultado, viento pero con piiiin"; con el ping probado: "el pin quitamos, no tiene sentido pero me gusta ese viento más agudo". Sin ping.

Eric aceptó la vuelta propuesta ("vale, dame") frente a repetir el mismo viento o dejarla muda.

**Cómo aplicarlo.** Si cambia `MORPH_MS` o `EASE_WIND`, `gust` lo sigue solo si se actualizan los puntos de la curva que le pasa `speeds`. Nada importa `cuelume` ni crea otro `AudioContext` fuera de `lib/ui-sounds.ts`.
