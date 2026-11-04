---
title: Las pestañas del proyecto llevan chincheta, tornado y criterio.md; la estrella queda para la IA
date: 2026-11-04
status: vigente
kind: diseño
---
**Contexto.** La pestaña de Pulido, entre Tablón y Sistema (`ProjectModes`), llevaba `sparkle`, la misma estrella que "Mejorar con IA", el agente y afinar un área.

**Decisión.** Tablón lleva `pin` (Phosphor `PushPin`, en lugar de los cuatro cuadrados `grid`), Pulido lleva `tornado` (Phosphor `Tornado`) y Sistema `file-md` (Phosphor `FileMd`, en lugar del velocímetro `gauge`), los tres añadidos a `ICONS` en `components/criterio/index.tsx`. `sparkle` se queda solo en lo que hace la IA.

**Por qué.** Eric: "este icono de estrella no me gusta nada". Entre doce candidatos de Phosphor (baraja, escoba, embudo, viento, intercambiar…) eligió el tornado. Del Sistema: "también tiene que haber otro icono mejor"; entre doce (huella, plano, capas, estructura…) eligió el del archivo .md, porque lo que sale del Sistema es el criterio.md. Del Tablón, "vamos a ver si hay alguno mejor": la chincheta, el tablón de corcho donde se clavan las referencias. Que tenga sentido porque es la animación con la que se entra en Pulido (el tornado de cartas, `PolishView`) es el argumento con el que se le propuso.

**Cómo aplicarlo.** Una función nueva de IA usa `sparkle`; nada que no sea IA lo usa.
