---
title: El círculo del hover de un botón de icono nunca pisa el texto vecino
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** En una pestaña de proyecto de la Isla que no está activa, el × de cerrar (`.island__tab-x`, un `IconButton` quiet xs de 24 px) aparece al pasar el ratón en el sitio del anillo de progreso, en absoluto a 7 px del borde derecho. El anillo mide 12 px (8 el punto ember) y el texto acababa a 6 px de él, así que el círculo del × al encenderse se montaba sobre las cifras del contador ("Landing Criterio 24 ×").

**Decisión.** La pestaña cerrable reserva al anillo un hueco del tamaño del × (`app/globals.css`, bloque `.island__tab--closable`): `.island__tab-main` lleva 14 px de relleno a la derecha, el punto ember (`.island__ring.cr-ring-new`) lleva 2 px de margen para ocupar lo mismo que el anillo, y el × va a 4 px del borde. Las cifras acaban siempre a 4 px del círculo, con anillo o con punto. La pestaña activa, que lleva el × en línea, no cambia.

**Por qué.** Eric, 07-10, al ver la pestaña: "ahí veo que el hovering circular de la X se pisa con el texto, cuidado con esas cosas".

**Cómo aplicarlo.** Un botón de icono que aparece sobre otra cosa (un × en el sitio de un anillo, un control que sale al pasar el ratón) necesita su hueco entero, círculo del hover incluido, reservado desde el reposo: el relleno del contenedor cuenta el círculo, no el icono. Al colocar algo en absoluto sobre texto, comprobar el hover, no solo el reposo.
