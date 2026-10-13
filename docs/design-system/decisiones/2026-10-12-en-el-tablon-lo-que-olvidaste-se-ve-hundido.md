---
title: En el tablón, lo que has votado olvidar se ve hundido hasta que se cierra el pulido
date: 2026-10-12
status: vigente
kind: diseño
---
**Contexto.** En un espacio de equipo el pulido es una votación y nada sale del tablón al votar ([decisión](2026-10-06-en-equipo-el-pulido-es-una-votacion-que-se-cierra.md)). Si los demás aún no han votado y vuelves al Tablón, todo se veía igual que antes de pulir: lo que habías descartado no se distinguía de lo que querías conservar. Eric: "al menos tiene que ver las cards que has descartado con cierto tono de opacidad o algo así no?".

**Decisión.** En el tablón de un proyecto, cada tarjeta que una misma ha votado olvidar en un pulido sin cerrar lleva `.tile-wrap.is-forgotten` en su envoltorio (`components/InspoCard.tsx`, prop `forgotten`, calculada en `components/InspoClient.tsx` desde `polishVotes`): la tarjeta y su pie bajan al 32 % de opacidad, suben al 80 % al pasar por encima, con foco dentro o seleccionada, y el tooltip del sistema (`data-tip`, no `title` nativo) dice "La olvidaste en el pulido. Sale si todo el equipo la olvida." (`t.polish.forgotOnBoard`). Al principio reusaba "Tu voto: que salga" del Pulido, y Eric no lo entendió fuera de allí: "no entiendo lo que significa la verdad". Solo cuenta el voto propio y abierto: los votos de los demás no se ven en el tablón. Al cerrar el pulido, la tarjeta sale al Inbox o vuelve a plena luz.

**Por qué.** Lo pidió Eric con esas palabras. Atenuar en vez de esconder es interpretación mía: el tablón sigue siendo de todo el equipo hasta que se cierra, así que la tarjeta no puede desaparecer, pero el tablón tiene que leerse como lo que a ti te queda. Enseñar solo el voto propio sigue la regla de que los votos ajenos no se ven antes de votar.

**Cómo aplicarlo.** Cualquier otra marca de voto en el tablón (dudas, votos ajenos) va por el mismo envoltorio y no cambia el diseño de la tarjeta. Opacidad sobre el envoltorio entero, no sobre el `article`, para que el pie no se quede a plena luz.
