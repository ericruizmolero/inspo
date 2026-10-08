---
title: Al importar, lo que ya estaba no cuenta como importado
date: 2026-10-08
status: vigente
kind: producto
---
**Contexto.** El aviso final de importar un tablero sumaba en "importado" también lo que ya estaba en la librería. Importar el mismo tablero dos veces se leía como si hubieran entrado cosas nuevas.

**Decisión.** La línea final separa cuatro cosas, en este orden: lo nuevo por tipo ("12 websites and 3 images imported."), lo que ya estaba ("20 were already in your library.", o "All 32 were already in your library." si no entró nada nuevo), lo que se quedó fuera y por qué ("1 skipped (a board inside the board)."; con varias razones, cada una con su cuenta) y lo que falló ("2 could not be saved."). Singular y plural en cada frase, en inglés y castellano. La web lo monta con `importSummary` (`lib/boards/summary.ts`) a partir del estado de cada cosa que devuelve `addMany` (`added`, `existed`, `invalid`, `error`); la extensión, con `boardResult` en `extension/chrome/import.js` y sus `_locales`.

**Por qué.** Lo pidió Alberto: un segundo import tiene que decir que no entró nada nuevo, no repetir la cuenta del primero.

**Cómo aplicarlo.** Un import nuevo (otra fuente, otra plataforma) cuenta solo `added` como importado. `npm run check:boards` comprueba las frases en los dos idiomas.
