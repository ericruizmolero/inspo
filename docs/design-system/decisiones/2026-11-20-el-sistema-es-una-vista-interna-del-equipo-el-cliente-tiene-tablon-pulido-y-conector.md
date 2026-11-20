---
title: El Sistema es una vista interna del equipo; el cliente tiene Tablón, Pulido y el conector
date: 2026-11-20
status: vigente
kind: producto
---
**Contexto.** Un proyecto tenía tres vistas para todo el mundo: Tablón, Pulido y Sistema (las 8 áreas y su `criterio.md`), y media app empujaba hacia la tercera: el botón "Ya tengo las referencias", el final del Pulido, los avisos de Tino, el selector de áreas de cada tarjeta. El vídeo nuevo de la portada (rama `landing-vault`, 19-11) cuenta otro recorrido: Guarda, Comenta, Pule, Vault, Conecta, Crea. En él no hay Sistema ni fichero: el agente se conecta, recibe las referencias conservadas y las piezas del Vault, y decide con ellas.

**Decisión.** El vídeo manda sobre el producto. El Sistema deja de ser una vista de los clientes y queda como vista interna de los socios, los mismos que ven `/admin` (`isAdmin`, `lib/activity.ts`). En `components/InspoClient.tsx`, `teamSystem = isAdmin` decide todo lo que lleva a él:

- La pestaña Sistema de `ProjectModes` (`noSystem`) y la dirección `?view=system`, que sin ser del equipo cae en el tablón. `setProjectView("system")` también, venga del agente del buscador o de un aviso.
- El botón "Ya tengo las referencias" (`StartButton`) de la barra del tablón.
- El selector de áreas de la tarjeta (`backs`, `areasIn`) y la pestaña de criterio de la ficha (`RefCriterio`).
- Los avisos de Tino que hablan del sistema: `first`, `stale`, `gaps` y `unused` (`boardNudges`, parámetro `noSystem`).
- El final del Pulido: sin `onSystem`, `PolishView` ofrece "Ir al tablón", como en el Cajón.

El sistema se sigue escribiendo por debajo para todos los proyectos, y el conector lo sigue sirviendo: solo cambia quién entra a verlo.

**Por qué.** Eric: "el sistema ya no debería estar porque se lo lleva todo al mcp", "el vídeo manda, es lo más actual, tenemos que cambiar cosas de producto", y sobre conservarlo: "del sistema SEGURO que iremos iterando de forma interna así que tenemos que tener la vista para el equipo. Obviamente ahora el sistema estará ligado con el MCP para elevar las webs con lo que hagamos en vault".

**Cómo aplicarlo.** Nada nuevo de cara al cliente nombra el Sistema, las áreas ni `criterio.md` como algo que se abre en la app: lo suyo es guardar, comentar, pulir y conectar. Lo que se construya sobre el sistema se monta detrás de `teamSystem`. Los primeros pasos ya siguen ese recorrido: proyecto, tres referencias, pulir y conectar (`lib/first-steps-core.ts`), sin ejemplo, brief ni pasada. El conector entrega las referencias primero y el sistema detrás: `read_criterio` abre con "What the team kept" (`keptReferences` en `lib/mcp/pieces.ts`), las referencias del tablón con las que pasaron el Pulido delante, quién guardó cada una y qué se dijo de ella, y en la primera lectura las ocho primeras como imagen; las 8 áreas siguen debajo y mandan donde están decididas. Queda por alinear, en este orden: los Ejemplos ("un sistema acabado"), ⌘K "Abrir el brief", los anillos de avance del sistema en la portada de proyectos y el menú móvil, y los textos que lo nombran (`whyText`, la bienvenida).
