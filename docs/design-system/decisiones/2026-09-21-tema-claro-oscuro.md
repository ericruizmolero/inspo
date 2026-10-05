---
title: Tema claro y oscuro desde los mismos tokens
date: 2026-09-21
status: vigente
kind: diseño
---
**Contexto.** El rediseño del 20-09 era solo oscuro.

**Decisión.** La app tiene tema claro y oscuro de primera. Tokens claros en `:root[data-theme="light"]`; preferencia en `localStorage inspo-theme` (sin valor = sistema), aplicada por un script inline antes de pintar; selector Sistema/Claro/Oscuro en el menú de cuenta (`ThemeSwitch`).

**Por qué.** Que el sistema sea de tokens y se pueda exportar como guía de estilo; los dos temas salen gratis si nadie pinta colores a mano.

**Cómo aplicarlo.** Nunca `#fff` ni `rgba(255,255,255,…)` para UI: tokens o `color-mix(... var(--text) ...)`. Excepciones deliberadas: tarjeta de recursos del sidebar y overlays sobre capturas, siempre oscuros.
