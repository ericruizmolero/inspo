---
title: Con sesión abierta, criterio.design entra directo a la app
date: 2026-10-15
status: vigente
kind: producto
---
**Contexto.** Desde que `criterio.design` es la web de marketing (ver [el monorepo](2026-10-11-monorepo-app-extension-y-web-de-marketing.md)), quien ya tiene sesión en `app.criterio.design` y escribe `criterio.design` ve la portada y tiene que pulsar "Entrar" para llegar a su tablón. La web es estática en otro servicio (Worker de Cloudflare) y no puede leer la cookie de sesión de la app, que es solo de `app.criterio.design`.

**Decisión.**
- La app deja una pista sin datos, `criterio_signed_in=1`, en el dominio `criterio.design` (httpOnly, Secure, SameSite lax, 30 días). `proxy.ts` la pone en cada página con cookie de sesión y la borra en la primera página sin ella, así que cerrar sesión la quita sola. La lógica del dominio está en `lib/signed-in-cookie.ts`; en localhost y en las previews de Vercel no se pone.
- `marketing-site/worker/index.ts` redirige con 302 `/`, `/es` y `/es/` a `https://app.criterio.design/` cuando llega esa cookie. El resto de páginas (precios, recursos, legal, extensión) se ven siempre. `?landing` enseña la portada igualmente.
- La app nunca se fía de la pista: si la sesión caducó, `/` sin sesión sigue siendo el arranque de invitado.

**Por qué.** Eric en la reunión del 13/10: "lo que sí que esperaría cuando entre a criterio.design, una vez que esté logueado, es que ya entre directamente, en vez de la pantalla de login". Alberto: "sí podemos eso". Una cookie compartida con solo un 1 no expone nada de la sesión (interpretación: es el mismo patrón que usan Linear o Notion entre su web y su app).

**Cómo aplicarlo.** El cambio de la web necesita desplegar `marketing-site` desde la cuenta de Cloudflare de Alberto (`npm run deploy -w @criterio/marketing-site`); el de la app sale con `main`. Si la portada gana otra ruta de idioma, se añade a `HOMES` en el Worker. Ninguna página de la app debe enlazar a la portada de la web esperando verla con sesión: usa `?landing`.
