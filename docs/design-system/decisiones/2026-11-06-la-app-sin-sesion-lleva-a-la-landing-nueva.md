---
title: La app sin sesión lleva a la landing nueva
date: 2026-11-06
status: vigente
kind: producto
---
**Contexto.** Con la landing nueva publicada en `criterio.design/es/` (PR #149), `app.criterio.design` sin sesión seguía enseñando la portada de invitado (`GuestStart`): caja para pegar una URL, precio y un criterio.md de ejemplo. Era provisional, "ahí irá la landing que hace Andoni".

**Decisión.** `/` de la app sin sesión redirige (307) a la landing de la web de marketing en el idioma de quien lee: `marketingHref("/", locale)`, o sea `criterio.design/es/` en castellano y `criterio.design/` en inglés (`app/(library)/page.tsx`).
- Solo cuando no hay cookie de sesión (`getSessionCookie` de Better Auth). Con una cookie caducada, `proxy.ts` mantiene la pista `criterio_signed_in` y el Worker de marketing devolvería al navegador a la app: para no entrar en bucle, ese caso sigue viendo `GuestStart`.
- `?add=<url>` (el "Guardar en Criterio" de la web) va antes y sigue llevando a login con la URL como destino.
- `/login` y el resto de páginas públicas no cambian.

**Por qué.** Eric: "aquí se tiene que ver la home nueva vaya", "app.criterio.design a secas sin login es la home". Una sola portada para quien no tiene cuenta, la de Andoni.

**Cómo aplicarlo.** La portada para quien no ha entrado se diseña en `marketing-site/`, no en la app. `GuestStart` queda solo como red de seguridad del caso de la cookie caducada; si se quita del todo, hay que resolver antes ese bucle. En inglés la redirección lleva a la portada antigua hasta que la landing nueva tenga versión en inglés.
