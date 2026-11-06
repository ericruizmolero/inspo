---
title: Tino dice lo que el tablón tiene más que lo normal, no lo más repetido
date: 2026-11-06
status: vigente
kind: producto
---

**Contexto.** El aviso de Tino "Aquí hay un patrón" contaba la etiqueta más repetida del tablón. En la Librería Criterio dijo "9 de las 10 referencias comparten 'centrado'". Medido sobre las 789 referencias etiquetadas, centrado sale en el 86 %, palo seco en el 80 %, mayúsculas en el 79 % y aireado en el 76 %: lo más repetido de cualquier tablón es lo que tiene casi cualquier web.

**Decisión.** `sharedTag` (`components/board-nudges.ts`) ya no cuenta etiquetas sueltas: compara las señales por área del etiquetado (`SIGNALS` en `lib/taxonomy.ts`, `areas[*].signals` de cada referencia) con lo normal (`SIGNAL_BASE`, el % de cada señal en todas las referencias, medido el 06-11 sobre 741). Habla de la señal que más se sale: en 3 referencias o más, en un tercio del tablón o más y al menos el doble de lo normal. Lo dice con las dos cifras ("3 de las 10 tienen serif de display. Lo normal es 6 de cada 100"). Sin nada raro, calla. Las señales son un filtro más del tablón (`g:serif-display`, `facetOf` y `viewOf` en `lib/taxonomy.ts`, su nombre en `taxonomy.signal`), así "Verlas" enseña justo esas. Igual en el Inbox.

**Por qué.** Eric: "no tiene sentido la verdad. tiene que ser consecuente con el contenido REAL del tablero" y "tino tiene que conectar con eso que trabaja JEV del etiquetado. llegar a cosas que el usuario no se da cuenta". Lo que todo el mundo tiene no es criterio; lo que este tablón tiene y los demás no, sí.

**Cómo aplicarlo.** Cualquier cosa que Tino diga del gusto de un tablón se compara con lo normal antes de decirse, nunca con el recuento solo. `SIGNAL_BASE` se mide de nuevo cuando cambie el vocabulario de `SIGNALS` o crezca mucho la biblioteca.
