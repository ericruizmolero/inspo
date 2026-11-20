---
title: La tarjeta compartida de una pieza del Vault no lleva marco, el fondo de la pieza la llena
date: 2026-11-20
status: sustituida
kind: diseño
---

**Contexto.** La tarjeta Open Graph de una pieza del Vault (`lib/vault-og.tsx`, servida en `/api/vault/<slug>/og`) ponía la imagen en una caja redondeada sobre un marco negro (`#0F0F0F`, 48 px por lado), con el nombre, la categoría y Tino en papel debajo. Pegado el enlace en Telegram, dentro de un globo oscuro, ese marco se leía como un contorno negro grueso alrededor de la pieza.

**Decisión.** La tarjeta ya no tiene marco ni caja redondeada. El fondo sobre el que se hizo la imagen de la pieza (el color de su esquina, o el `ground` de la entrada, o `#F4F0E6`) llena la tarjeta hasta los bordes. La imagen va centrada arriba, a todo el ancho (`STAGE_W` 1200, `STAGE_H` 452), y debajo, sobre el mismo fondo, la línea de categoría (al 62 % de opacidad), el nombre y Tino, en la tinta que se lee sobre ese fondo (`inkOn`: papel `#EDE6D6` sobre oscuro, tinta `#1B1B18` sobre claro, el mismo corte de luminancia que `groundOf` en `lib/vault-preview.ts`).

**Por qué.** Eric, 20-11, viendo la tarjeta en Telegram: "creo que puede vestir mejor el thumbnail no? ese contorno negro no mola". Interpretación nuestra: sin marco la tarjeta enseña más pieza y es la propia pieza la que da el color, en vez de ser siempre negra.

**Cómo aplicarlo.** Una imagen que se comparte fuera no lleva un marco nuestro alrededor: el fondo de lo que enseña llega a los bordes y lo nuestro (nombre, Tino) se escribe encima con la tinta que toque. Comprobado en render con un fondo oscuro y uno claro; no se ha visto todavía en producción ni con una imagen cuyo fondo no sea liso.
