---
title: Sale la caja "Dile a Tino qué cambiar" de la página Sistema
date: 2026-11-04
status: vigente
kind: producto
supersedes: 2026-11-04-tino-pregunta-hacia-donde-si-el-cambio-no-lo-dice
---
**Contexto.** La página Sistema tenía una caja abajo para pedir cambios al fichero en palabras. El fichero ya se edita en el sitio, se comenta, y el agente propone cambios por el conector.

**Decisión.** Salen la caja, `/api/system/edit`, `lib/system/edit.ts` y su prompt. Tino sigue en la esquina con sus notas; las que rellenaban la caja desaparecen o se quedan sin botón.

**Por qué.** Alberto: "remove this search functionality in a whole in the system section of criterio".

**Cómo aplicarlo.** Para cambiar el fichero: se escribe encima, se comenta, o el agente propone.
