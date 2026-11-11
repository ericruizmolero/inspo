---
title: Tino duerme por defecto y solo se despierta si le pulsas
date: 2026-11-11
status: vigente
kind: diseño
---
**Contexto.** Desde el 06-11 Tino entraba callado pero despierto: entero en su esquina, con cara de `watching` si tenía algo pendiente. Dormido solo estaba quien lo había silenciado con el interruptor. Eric, viendo a Tino despierto sobre el tablón: "por defecto siempre Tino dormido".

**Decisión.**
- En `components/HomeTino.tsx` el interruptor arranca apagado: `readOn` solo da despierto si `localStorage["criterio:tino"]` vale `"on"`. Sin nada guardado (cuenta nueva, navegador nuevo) Tino está silenciado: hundido 44 px (`.tino-corner.is-muted`), cara `asleep`, sin globos.
- Despertarlo es un clic en él o el interruptor de la pastilla (`TinoSwitch`), y se recuerda en ese navegador. Volver a dormirlo borra la clave.
- El valor viejo `"off"` deja de leerse: quien lo tenía sigue dormido, y quien no tenía nada pasa a dormido.
- No cambia lo que contesta a la persona (`speak`: una búsqueda, una edición): eso sale aunque duerma. Pulido tampoco cambia.

**Por qué.** Eric lo pidió sin explicarlo. Interpretación mía: sigue la línea de "entra callado"; Tino no ocupa la esquina ni la atención hasta que alguien lo llama.

**Cómo aplicarlo.** Nada nuevo puede contar con que Tino esté despierto: lo que tenga que verse sin pedirlo no va en un aviso suyo. No se añade ningún camino que lo despierte solo.
