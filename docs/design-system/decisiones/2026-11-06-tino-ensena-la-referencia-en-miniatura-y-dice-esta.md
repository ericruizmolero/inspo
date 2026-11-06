---
title: Tino enseña la referencia en miniatura y dice "esta"
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** Cuando Tino hablaba de una referencia, la nombraba por su título: "A website screenshot added by Sci-Fi Archives on lleva aquí un mes…", inglés y castellano mezclados y cortado. Eric: "cuánto costaría que en vez de poner el título pusiésemos un mini thumbnail?", "se mezcla inglés con castellano y todo", y para la forma: "en la home hay tarjetitas así, igual se pueden replicar".

**Decisión.**
- `TinoNudge` y `CornerSay` llevan `thumb` (`components/HomeTino.tsx`); `TinoCorner` la pinta a la izquierda del texto (`.tino-corner__with`, `.tino-corner__thumb`) y pulsarla hace lo que el botón del aviso.
- La forma es la tarjeta de la landing (`.v9 i` en `marketing-site/public/es/index.html`): 72 px de ancho en 8:5, línea de 1,5 px y sombra dura de 3 px en `--on-butter`, radio 8, recortada desde arriba.
- `board-nudges.ts` nombra con `named()`: con imagen, "esta" (`t.tino.thisOne`, "this one") y la miniatura; sin ella, el nombre como antes. Vale en el tablón (comentario sin contestar, la callada, la vieja, pulsado sin nada) y en el Cajón (la suelta, la comentada, la tuya, la de otra persona, la que tiene casa, pulsado sin nada). La imagen sale de `tinoPicture` en `InspoClient`: la miniatura de la tarjeta y, si no hay, la cara de quien la guardó.
- El comentario sin contestar pasa a "Andoni, sobre esta: '…'" (antes "Andoni en X"), para que lea bien con "esta".

**Por qué.** La imagen dice de cuál habla mejor que un título ajeno; sin coste, porque la miniatura ya está cargada en el tablón.

**Cómo aplicarlo.** Un aviso nuevo sobre una referencia concreta usa `named()` y pasa su `thumb`; los avisos sobre un grupo (los tipos, la misma web) van sin imagen.
