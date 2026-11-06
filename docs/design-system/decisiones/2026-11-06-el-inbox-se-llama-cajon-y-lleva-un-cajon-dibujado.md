---
title: El Inbox se llama Cajón en castellano y lleva un cajón dibujado a medida
date: 2026-11-06
status: vigente
kind: diseño
---
**Contexto.** El sitio donde cae lo que aún no está en ningún proyecto se llamaba "Inbox" también en castellano, y su pestaña de la Isla no llevaba icono. Eric: "¿podemos cambiar Inbox de nombre a Cajón?", "en inglés Inbox, eso sí", "no sé si acompañarlo con icono". Entre ocho opciones pintadas en la pestaña descartó `Tray` de Phosphor ("no me gusta tan cuadrado") y eligió un cajón dibujado a medida, el cajón un poco abierto.

**Decisión.**
- En castellano es **Cajón** en toda la interfaz (`t.projects.inbox`, `labels.ts`, los textos de Tino y de Pulido, la extensión): "vuelve al Cajón", "Cajón vacío", "Ordenar el Cajón", "Mirar en el Cajón". En inglés sigue siendo Inbox. En el código, la URL (`?in=inbox`) y los datos no cambia nada. La "Bandeja" del Sistema es otra cosa y se queda.
- El icono `inbox` de `Icon` (`components/criterio/index.tsx`) es `Cajon`: un cajón un poco sacado, dibujado en la rejilla de 256 de Phosphor con su trazo regular (16) y uniones redondas, para que case con el resto. Sale en la pestaña del Cajón de la Isla (la única pestaña con icono, porque no es un proyecto) y en el menú de móvil.
- `AgentCard` ya no escribe "Inbox" a mano: usa `t.projects.inbox`.

**Por qué.** Eric lo pidió con esas palabras. Que el cajón sea un dibujo propio rompe la regla de "solo Phosphor", y es a propósito: ninguno de Phosphor se leía como cajón sin ser cuadrado.

**Cómo aplicarlo.** El Cajón se nombra con `t.projects.inbox`, nunca con la palabra a mano. Otro icono propio solo entra con el visto bueno del equipo y dibujado igual: rejilla de 256, trazo 16, uniones redondas.
