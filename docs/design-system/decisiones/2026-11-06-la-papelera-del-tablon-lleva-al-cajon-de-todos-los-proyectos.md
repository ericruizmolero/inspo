---
title: La papelera del tablón lleva la tarjeta al Cajón, fuera de todos los proyectos
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** En el tablón de un proyecto, la papelera sacaba la tarjeta solo de ese proyecto, con su vuelo hacia el Cajón. Si la tarjeta estaba también en otro proyecto, se quedaba allí y nunca llegaba al Cajón, aunque se la viera volar hacia él. Le pasó a Eric con una de Savvia que también estaba en "Inspo genérica": "en el cajón no está lo que he borrado", "eso es un bug". Entre sacarla de todos, avisar de que sigue en otro o investigar cómo entró en dos, eligió que la papelera lleve al Cajón sí o sí.

**Decisión.** La papelera de una tarjeta en el tablón de un proyecto (`onTakeOut` en `components/BoardCard.tsx`) la quita de todos los proyectos que la tienen y vuela al Cajón (`flyToInbox`), sin segundo clic. Su etiqueta pasa de "Quitar del proyecto" a "Al Cajón" (`t.card.removeFromProject`). Sacarla de un solo proyecto sigue siendo cosa de la carpeta de la tarjeta, que marca y desmarca proyectos uno a uno.

**Por qué.** Lo que se ve tiene que ser lo que pasa: si vuela al Cajón, está en el Cajón.

**Cómo aplicarlo.** Un gesto que manda algo a un sitio lo deja allí de verdad; si no puede, no anima ese destino.
