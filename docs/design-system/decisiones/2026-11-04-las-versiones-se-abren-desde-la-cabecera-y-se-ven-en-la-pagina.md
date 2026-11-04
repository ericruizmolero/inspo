---
title: Las versiones se abren desde la cabecera y se ven en la página, con lo que cambió
date: 2026-11-04
status: vigente
kind: diseño
---
**Contexto.** Las versiones de criterio.md vivían en un modal (`VersionsModal`) escondido en la flecha junto a Copiar. La cabecera decía "Sistema v2 · 8 de 8 decididas" y no se podía pulsar.

**Decisión.**
- La cabecera dice solo "Versión N" (`headVersion` en `lib/i18n/{en,es}/ui.ts`) y abre un desplegable con todas las versiones (`VersionPicker` en `components/VersionPicker.tsx`).
- Al elegir una, `VersionView` ocupa el sitio de la página:
  - muestra el fichero de esa versión con lo que entró y salió frente a la anterior (`lineDiff`, `lib/line-diff.ts`);
  - tiene flechas y ← → para ir de la v1 a la última;
  - Descargar, Copiar y Volver a la actual.
- `VersionsModal` y la entrada "Versiones" de `FileMenu` desaparecen.

**Por qué.** Eric: "las versiones tiene que ser un desplegable o algo que puedas ver todas las versiones, clickar en ellas y verlas cambiadas en cada uno", y sobre la cabecera: "el puntito es ai slop, pon: Versión 1 y ya".

**Cómo aplicarlo.** La versión se nombra siempre como "Versión N", sin puntos medios ni recuentos al lado. Ver una versión antigua nunca la edita: se copia, se descarga o se vuelve a la actual.
