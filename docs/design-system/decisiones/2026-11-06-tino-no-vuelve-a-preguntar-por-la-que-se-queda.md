---
title: Tino no vuelve a preguntar por la referencia que se queda
date: 2026-11-06
status: aceptada
kind: producto
---

**Contexto.** Cuando Tino pregunta por una referencia vieja ("¿Te acuerdas de esta?"), solo había dos salidas: "Repásala", que abre la ficha, y "Luego", que calla el aviso solo durante esa visita. Si la referencia sigue valiendo, no había manera de decirlo, y en la visita siguiente volvía a preguntar por la misma.

**Decisión.** Esos avisos llevan un segundo botón, "Se queda" (`keep` en `TinoNudge`, texto `t.tino.keep`). Al pulsarlo, la `key` del aviso se guarda en `criterio:tino-seen` (`localStorage`), Tino hace `aprueba` y pasa al siguiente aviso. `oldReference` en el tablón e `inboxNudges` en el Inbox se saltan lo ya respondido (`settled` de `components/HomeTino.tsx`), así que la vez siguiente pregunta por otra. Lo llevan `old:<id>`, `mine:<id>` y `theirs:<id>`.

**Por qué.** Eric (06-11): "tiene que haber mensaje de que si que quieres conservar que ya no te salga más ese mensaje". Usamos "Se queda" porque es la misma palabra del Pulido del Cajón ("se queda / se borra"); esto es interpretación nuestra.

**Cómo aplicarlo.** Un aviso que pregunta si algo sigue valiendo lleva `keep`, y la función que lo elige se salta lo `settled`. Se recuerda por máquina, no en la base de datos, como el resto de lo que Tino ya ha dicho.
