---
title: Descubrir ocupa 1360 de ancho, no 1040
date: 2026-11-18
status: vigente
kind: diseño
---
**Contexto.** Las cuatro secciones de Descubrir iban en una columna de 1040 px. Con el Vault (panel de categorías más rejilla de tarjetas) se quedaba corta y sobraba pantalla a los lados.

**Decisión.** La columna de Descubrir pasa a 1360 px en todas sus secciones: `.disc-head`, `.disc-bar`, `.disc-list__group` y `.disc-list__none` (`components/Discover.css`), `.tpls-inner` (`components/SystemMarkdown.css`) y `.vault`, `.vault-sheet` (`components/Vault.css`). La cabecera sigue en la columna del contenido y a la misma altura en las cuatro.

**Por qué.** Eric, 18-11: "todo de descubrir puede ocupar más ancho de pantalla para aprovechar espacio".

**Cómo aplicarlo.** Una sección nueva de Descubrir usa el mismo ancho; no se ensancha una sola. El texto corrido dentro (entradillas, documentación) mantiene su propio tope de lectura.
