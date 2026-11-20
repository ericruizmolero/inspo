---
title: La portada lleva los planes de plans.ts y su formulario apunta a la lista de espera
date: 2026-11-20
status: vigente
kind: desarrollo
---
**Contexto.** La portada de Andoni ([decisión del 19/11](2026-11-19-la-portada-es-la-ventana-del-producto-con-el-vault-y-el-video-nuevo.md)) era HTML estático en `marketing-site/public/`, sin precios, y su formulario llevaba al acceso de la app porque aún no existía `POST /api/waitlist`. Un HTML en `public/` no puede leer `src/plans.ts`, así que los precios habría que escribirlos a mano y se separarían de `/pricing/` y de la app.

**Decisión.** Cambian dos puntos de la decisión del 19/11; el resto (la ventana, el vídeo, el Vault) sigue igual.
- La portada pasa por Astro. `marketing-site/video/landing/construir.py` escribe `src/pages/index.astro` y `src/pages/es/index.astro` en lugar de `public/index.html` y `public/es/index.html`, que se borran. Cada `<script>` y `<style>` de `plantilla.html` va con `is:inline`, así que Astro los sirve sin tocarlos. Lo que sale del código de la web entra por marcas `%%…%%` de la plantilla: `%%PRICING%%`, `%%PRICING_NAV%%`, `%%WAITLIST%%`, `%%LOGIN%%` y `%%SIGNUP_MODE%%`.
- Los cuatro planes van entre la ventana del producto y criterio.md (`HomePlans.astro`, que lee `PLANS`, `PLAN_TEXT`, `PLAN_LINES` y `fmtPrice` de `src/plans.ts`), con el aspecto de la portada: tarjetas `--paper-l` con borde de tinta de 1,5 px y radio `--r`, y la serif `--display`. "Precios" en la cabecera (`.top-nav`) lleva a `#pricing`.
- Los dos formularios (`form.invite`) mandan el correo a `POST /api/waitlist` de la app (`WAITLIST_URL`, que pasa de `signup-mode.ts` a `src/i18n.ts`, junto a `APP_URL`) con el consentimiento, el campo trampa y el idioma, y dicen "Ya estás en la lista" sin salir de la página. `signup-mode.ts` corre también aquí: con el registro abierto, cada formulario es su tecla "Empieza gratis" (`.start-free`).

**Por qué.** Alberto: los planes tienen que salir de `plans.ts`, "never typed into the page, so /pricing/, the app and the home can't drift", y "app links go through APP_URL", sin `app.criterio.design` escrito en la página. Los planes van antes de criterio.md y no después porque criterio.md y el cierre son un mismo tramo oscuro que una franja de papel cortaría (interpretación nuestra al ver la página).

**Cómo aplicarlo.** La portada se sigue cambiando en `plantilla.html` y se construye con `construir.py`; las páginas de `src/pages/` no se editan a mano. Nada que dependa de la app o de los planes se escribe en la plantilla: va como marca y `construir.py` lo cambia por código de la web (`marketing-site/video/README.md`, «Lo que la portada toma de la web»). Las clases de los planes son `pricing*` y `plan-*`; la plantilla ya usa `.plans` en la demo. El patrón está en [patrones](../patrones.md) y la ruta en [mapa](../mapa.md).
