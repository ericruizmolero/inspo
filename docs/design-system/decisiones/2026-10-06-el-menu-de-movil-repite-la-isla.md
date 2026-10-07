---
title: El menú de móvil repite la Isla, con sus mismos destinos y en su orden
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** La barra lateral de móvil (`components/Sidebar.tsx`, `SidebarNav`) era la navegación anterior a la Isla y se quedó solo para teléfonos: botón de añadir, "Todo", Inbox, proyectos, "Ver directorio" con siete webs externas barajables, feedback, tema y plan. La Isla de escritorio navega otra cosa: Inicio, Descubrir, Inbox, los proyectos como pestañas y Conectores. Desde un proyecto, en el móvil no se podía volver a Inicio ni llegar a Descubrir ni al conector MCP.

**Decisión.** `SidebarNav` lleva lo mismo que la Isla y en su orden: Inicio (`space` "home"), Descubrir (abre en "templates", como la pestaña), el grupo Proyectos con Inbox, cada proyecto con su anillo y su contador y "Nuevo proyecto", y al pie Conectores (`Connectors` con `row`, el mismo menú que el botón de la barra), Dar feedback, Cambiar tema y el medidor del plan. Fuera el botón de añadir (lo hace el "+" de la barra superior), "Todo" y las webs externas con su baraja (`SIDEBAR_PICKS`, `PickCard` y sus reglas `.nav-item--pick-row` en `app/globals.css` se han borrado). En táctil el "…" de cada proyecto es siempre visible y el contador se pone a su izquierda (`@media (hover: none)` en `.nav-item--project`), en vez de debajo.

**Por qué.** Eric, 06-10: "el sidebar para nada es como el de desktop... se tiene que parecer no?" y "faltan muchas cosas responsive que no concuerdan con lo bien que está en desktop". Interpretación mía: una app con dos navegaciones distintas se aprende dos veces; el móvil hereda lo decidido en escritorio y no al revés.

**Cómo aplicarlo.** Cuando la Isla gane o pierda un destino, `SidebarNav` cambia en el mismo trabajo. El directorio sigue en el menú de espacio (`WorkspaceMenu`), que es el mismo en los dos sitios.
