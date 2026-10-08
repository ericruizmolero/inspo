---
title: El tablón ordena por día y, dentro del día, por la hora del post en X
date: 2026-10-08
status: vigente
kind: producto
---
**Contexto.** El tablón ordena por la fecha de la referencia (`date`, un día) y, a igual día, por el orden en que llegaron del servidor, que es el más reciente guardado primero. Una importación de X trae los posts del más reciente al más antiguo, así que dentro de un mismo día quedaban al revés: el guardado hace más tiempo salía antes. Eric lo veía como un tablón desordenado ("una vez más el tablón cuando importo de X no se me ordena por fecha más reciente a más antiguo").

**Decisión.** Un solo comparador, `newestFirst` en `lib/search-query.ts`, para todo lo que ordena el tablón (`InspoClient`, `ProjectChooser`): día más reciente primero; a igual día, si las dos referencias son posts de X, el id del post decide (es un snowflake, crece con el tiempo); si no, se queda el orden del servidor. El `parseDate` duplicado de `InspoClient` desaparece.

**Por qué.** La fecha de una referencia es un día, no una hora, y para un post de X la hora exacta está en su id. Así el orden del tablón coincide con el de X sin tocar el esquema.

**Cómo aplicarlo.** Cualquier vista que ordene referencias usa `newestFirst`, no un `sort` propio por `parseDate`. Si otra fuente trae una hora exacta (una fecha en el id, un campo propio), entra como desempate en ese mismo comparador.
