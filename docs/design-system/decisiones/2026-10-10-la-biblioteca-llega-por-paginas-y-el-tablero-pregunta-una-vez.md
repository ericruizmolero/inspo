---
title: La biblioteca llega por páginas y el tablero abierto hace una sola petición cada 15 s
date: 2026-10-10
status: vigente
kind: desarrollo
---
**Contexto.** La biblioteca se cargaba entera: todas las referencias con sus etiquetas, todos los comentarios y los sistemas completos de todos los proyectos. Con 2.000 referencias eran unos 3 MB. Y una pestaña abierta hacía cuatro consultas periódicas: cambios cada 15 s (la biblioteca entera de vuelta si el sello se movía), actividad cada 20 s, la campanita cada minuto y los comentarios cada 20 s con la ficha abierta (ericruizmolero/inspo#112).

**Decisión.**
- `loadLibrary` (`lib/library.ts`) manda la página más nueva (`PAGE`, 300 referencias) con un cursor; el cliente pide el resto en segundo plano, página tras página, a `GET /api/library/page`. El orden es `date collate "C" desc, created_at desc, id desc`, y el cursor lleva esas tres claves.
- `POST /api/pulse` (`lib/pulse.ts`) sustituye a la consulta de cambios. Recibe el sello y `since` de la última respuesta, el último valor de la campanita y el latido de presencia. Sin cambios devuelve solo `{ stamp, since }`. Con cambios devuelve las referencias cambiadas (con la misma forma que una página), los comentarios nuevos, los ids borrados, y proyectos, enlaces o votos enteros solo si su parte del sello se movió.
- Los borrados los apunta la base de datos: triggers `AFTER DELETE` en `inspo_item` e `inspo_comment` escriben `library_tombstone` (migración `0036`). El cron `morning` los borra a los 7 días; quien vuelve después recarga la biblioteca.
- El pulso mira 5 s antes de su cursor (`OVERLAP_MS`) y el cliente une por id (`lib/library-mirror.ts`): una fila vista dos veces deja el mismo estado.
- Los comentarios llegan con la página de su referencia y por el pulso. La ruta que devolvía todos los comentarios del espacio cada 20 s se quitó.
- La biblioteca lleva un resumen del sistema de cada proyecto (`SystemSummary` en `types/system.ts`: cada área decidida o no, los ids de su evidencia y los ids que leyó la última pasada). El sistema entero se pide al abrir el proyecto o una ficha, y se guarda en otro mapa.
- En el tablero, el latido de presencia va dentro del pulso y la campanita solo pide su lista cuando el pulso dice que se movió (`latestTeamEvent` en `lib/notify.ts`). Las demás páginas mantienen su latido de 20 s.

**Por qué.** Del issue: "Un workspace de 2.000 elementos abre en menos de 2 s, y una pestaña abierta sin cambios hace como mucho 4 peticiones por minuto con respuestas de pocos KB". Medido con `npm run bench:library`: la primera página pesa 465 KB y las 2.000 referencias 3.104 KB, y un pulso sin cambios ocupa 187 bytes. Las páginas llegan todas al abrir y no al hacer scroll porque la búsqueda, los chips, el Inbox y los tablones filtran en memoria. Llevar esos filtros al servidor es #115 (interpretación de quien lo construyó).

**Cómo aplicarlo.** Algo nuevo que el tablero refleja va en el sello (`readStamp`) y en el pulso, no en otra consulta periódica. Un tipo de fila nueva que se pueda borrar y que el cliente guarde lleva su trigger de lápida. Un evento nuevo de la campanita va en `teamEvents` y en `latestTeamEvent`. Detalle en [Desarrollo](../desarrollo.md#biblioteca-y-pulso).
