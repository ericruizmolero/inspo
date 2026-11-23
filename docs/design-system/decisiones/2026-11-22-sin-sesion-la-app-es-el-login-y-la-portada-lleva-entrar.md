---
title: Sin sesión, app.criterio.design es el login, y la portada de criterio.design lleva Entrar
date: 2026-11-22
status: vigente
kind: producto
supersedes: La app sin sesión lleva a la landing nueva (2026-11-06)
---
**Contexto.** Desde el 06/11, `/` de la app sin sesión redirigía a la landing de criterio.design. Con el registro solo por invitación, la portada de la lista de espera esconde "Empieza gratis" y su cabecera solo llevaba "Precios", así que quien ya tenía cuenta y abría `app.criterio.design` acababa en la landing sin ningún camino al acceso: solo escribiendo `/login` a mano. El botón Volver del login iba a `/` de la app, que a su vez mandaba a la landing.

**Decisión.**
- `/` de la app sin sesión es el login. `proxy.ts` ya no lo tiene en `PUBLIC` y lo manda a `/login` como cualquier otra página (en desarrollo, a `/api/dev-login`); con una cookie de sesión caducada, `app/(library)/page.tsx` hace lo mismo. La dirección vuelve tras entrar: `?add=`, `?in=` y el resto viajan en `next`, también desde `proxy.ts`, que ahora lo pone en `/` cuando la dirección lleva consulta.
- El botón Volver de `/login` lleva a la landing en el idioma de quien lee: `marketingHref("/?landing", locale)`. `?landing` hace que el Worker (`marketing-site/worker/index.ts`) enseñe la portada aunque una sesión caducada haya dejado la cookie `criterio_signed_in`, que lo devolvería a la app.
- La cabecera de la portada (`.top-nav` en `marketing-site/video/landing/plantilla.html`) lleva "Log in" / "Entrar" junto a "Precios", con el mismo estilo de texto y 24 px entre ellos. Sale de `copy[locale].login` de `src/i18n.ts` por la marca `%%LOGIN_NAV%%` de `construir.py`; el enlace, por `%%LOGIN%%`.
- Se retira `GuestStart` (`components/GuestStart.tsx`, sus clases `.guest*`, los textos `guest` y `login.inviteOnlyShort`) y las props `lead` y `children` de `EmptyStart`, que solo usaba él. `/` sale del sitemap de la app: es una redirección.

**Por qué.** Alberto: "i cannot access the login because i'm redirected to the landing", "i want to be able to access to login in app.* and also to go to the landing, make the better ux decision". Interpretación nuestra: quien escribe `app.` ya tiene cuenta y viene a entrar, como en la mayoría de productos con la app en un subdominio; quien aún no la tiene llega a criterio.design por búsqueda o enlace. La idea del 06/11 de Eric, una sola portada para quien no tiene cuenta, sigue en pie: esa portada es criterio.design, y el login enlaza a ella.

**Cómo aplicarlo.** La portada para quien no ha entrado se sigue diseñando en `marketing-site/`; la app sin sesión no tiene portada propia. Toda página de la web de marketing con cabecera ofrece entrar. La portada, hasta el lanzamiento, no lleva cabecera: [decisión del 23/11](2026-11-23-hasta-el-lanzamiento-la-portada-no-lleva-cabecera.md). Un enlace de la app a la landing que pueda abrir alguien con una sesión caducada lleva `?landing`. La ruta está en [mapa](../mapa.md) y el componente retirado, en [componentes](../componentes.md).
