---
title: El tablero tiene historial de versiones como Sheets y el reloj vale también para Sistema
date: 2026-11-09
status: vigente
kind: diseño
---
**Contexto.** Con el conector, un agente añade y quita referencias del tablero sin que nadie lo vea pasar (hoy se metieron duplicados y hubo que quitarlos). Las versiones existían para criterio.md, no para el tablero.

**Decisión.** Cada cambio del tablero deja una versión (`board_version`, `lib/board-versions.ts`): qué referencias tenía y qué entró y salió. Se engancha en `fileItems` y `unfileItems` (`lib/projects.ts`) y en la salida del Pulido, así que vale para la app, la extensión, el agente y el Pulido; quién y por dónde salen de la petición (`requestPerson` en `lib/log.ts`, `via` "mcp:<cliente>" en el conector). Los cambios de la misma persona por la misma puerta en cinco minutos son una versión, y el primer cambio guarda también el tablero de antes. Un reloj (`history`) en la barra de arriba abre la lista: en el Tablón, las del tablero (`components/BoardHistory.tsx`); en Sistema, las de criterio.md (`SystemHistoryButton`). Se ven y se restauran como en Google Sheets, con el diseño de las versiones del Sistema (`.vpk`).

**Por qué.** Eric: «el tablero también puede tener versiones... cuando quitas, pones, del MCP y demás, que puedas ver versiones anteriores de tu tablero como las de tu sistema»; «como un historial de versiones como hace google sheets»; «copiar un poco lo mismo que tenemos en sistema, bien diseñado»; y del reloj: «me gusta mucho el icono ahí, la idea es que valga tanto para tablón como para sistema».

**Cómo aplicarlo.** Todo lo que pone o quita referencias de un tablero pasa por `fileItems` o `unfileItems` (o llama a `boardChanged`), nunca escribe `project_item` a mano. Un historial nuevo usa la lista y la barra `.vpk`, y se abre desde el mismo reloj.
