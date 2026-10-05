---
title: Código en inglés, interfaz en dos idiomas
date: 2026-09-23
status: vigente
kind: desarrollo
---
**Contexto.** El código mezclaba castellano e inglés (`empresa`, `puestoPor`, `/extension/conectar`).

**Decisión.** Código, comentarios, campos y rutas en inglés. Los textos de UI van a `lib/i18n/en/*.ts` y `lib/i18n/es/*.ts` a la vez, inglés por defecto (cookie `lang`). La extensión usa `_locales/{en,es}`.

**Por qué.** Producto internacional y repo compartido entre socios; el castellano sigue siendo primera clase en la UI.

**Cómo aplicarlo.** Ningún texto visible escrito en un componente. Una clave nueva se añade en los dos idiomas o no compila. Lo que lee el equipo directamente (handoffs, issues, este sistema) va en castellano.
