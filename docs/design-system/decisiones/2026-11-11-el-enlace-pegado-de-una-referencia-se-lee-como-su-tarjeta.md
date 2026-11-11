---
title: El enlace pegado de una referencia se lee como su tarjeta, con la nota de quien la guardó
date: 2026-11-11
status: vigente
kind: producto
---
**Contexto.** Un enlace a una referencia (`/i/<id>`) pegado en Telegram, WhatsApp, Slack o X salía con el nombre de la referencia de título (en un post de X, el texto del tuit cortado) y su imagen. La nota y los comentarios se quedaban dentro a propósito. Eric, con la captura de Telegram junto a la tarjeta del tablón ("Eric Muy chulo este Storybook…"): "a la hora de compartir igual es mejor que sea tipo como compartir la card?".

**Decisión.**
- El título de la vista previa es la línea de debajo de la tarjeta: quién la guardó y su nota, "Eric: Muy chulo este Storybook…" (`captionOf` en `lib/share-card.ts`, usado en `generateMetadata` de `app/(library)/i/[id]/page.tsx`). Espacios en uno, 200 caracteres como mucho, sin nombre si el autor es el antiguo "Both".
- Sin nota, el título sigue siendo el nombre de la referencia.
- La descripción ("De x.com, en la biblioteca de un equipo en criterio.design") y la imagen no cambian.
- Sale solo la nota de quien guardó la referencia. A diferencia de la tarjeta, nunca la primera respuesta del hilo, ni caras, ni el número de comentarios, ni el espacio.

**Por qué.** Interpretación nuestra: lo que se comparte es lo que el equipo dice de la referencia, no el título de la página ajena. Va en el texto y no dibujado en la imagen porque la imagen de un post de X la sirve X y no pasa por nosotros (`staysInside`). Solo la nota, porque el enlace se lee sin sesión y una respuesta puede ser de otra persona que no ha decidido compartirla.

**Cómo aplicarlo.** Lo que se añada a la vista previa de un enlace sale de lo que escribió quien guardó la referencia. Lo que escriben otros en el hilo no sale sin sesión.
