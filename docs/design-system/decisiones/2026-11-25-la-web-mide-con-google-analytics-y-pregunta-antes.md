---
title: La web mide con Google Analytics y pregunta antes donde la ley lo pide
date: 2026-11-25
status: vigente
kind: producto
---
**Contexto.** La web no medía nada y la política de privacidad lo decía: "no hay aviso que aceptar".

**Decisión.**
- Google Analytics 4, solo en `criterio.design`. La app no se mide con terceros. `GA_MEASUREMENT_ID` vacío en `marketing-site/src/measurement.ts` apaga todo, aviso incluido, y solo mide el host de producción.
- El mismo patrón que las otras webs de Alberto: antes del sí no se carga `gtag.js`; se pregunta en la UE, el EEE, Reino Unido, Suiza y país desconocido; en el resto, el Worker marca `<html data-consent="implied">` y está encendido. Global Privacy Control es un no. La respuesta dura seis meses; retirar un sí borra las cookies y recarga. Anuncios y Google Signals, apagados.
- El aviso (`CookieNotice.astro`) va abajo a la izquierda, lejos de Tino y de la tecla del vídeo; en móvil, a todo el ancho. "No, gracias" y "Sí" son la misma tecla de papel, una al lado de la otra, sin primario. Se vuelve a abrir con "Cookies" en el pie (`CookieLink.astro`).
- Cuatro eventos: `waitlist_joined` (con `form`), `video_opened`, `question_opened` (con `question`) y `plans_cta_clicked`. Salen de lo que la página ya anuncia (`trackPage` en `scripts/analytics.ts`): ninguna pieza sabe que se mide. `/landing/`, aparcada, no mide.

**Por qué.** Alberto: "integra ahora el mensaje de cookies en criterio y también google analytics". Medir solo la web y los cuatro eventos son propuesta nuestra.

**Cómo aplicarlo.** Los ajustes de Google (dirección recortada, dominio y duración de las cookies, anuncios apagados) van en `gtag("set")` antes de `js`: el contenedor se inicia solo y descarta los de `config`. Tras tocar `analytics.ts` se mira en producción la petición a `/g/collect` y las cookies `_ga`. Un evento nuevo entra en `Events` y responde a una decisión, sin nada que diga quién es la persona. Si cambia lo que se guarda o durante cuánto, cambia la privacidad en los dos idiomas en el mismo trabajo. `tests/marketing-consent.test.ts` fija que nada sale antes del sí.
