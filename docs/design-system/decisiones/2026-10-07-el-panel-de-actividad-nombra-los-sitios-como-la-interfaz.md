---
title: El panel de actividad nombra los sitios como la interfaz: Inicio, Inbox, Tablón, Pulido, Sistema, Ficha
date: 2026-10-07
status: vigente
kind: producto
---
**Contexto.** "Dónde pasan el tiempo" (`/admin/usage`) seguía con los nombres de antes de los proyectos: Biblioteca, DESIGN.md, Búsqueda IA, Añadir inspo. El cliente solo distinguía cinco áreas, así que las horas en el Tablón, en Pulido y en el Sistema caían todas en "Biblioteca", y nada de lo nuevo (Inbox, Ejemplos, Skills, la librería interna, el conector MCP) aparecía.

**Decisión.** Los códigos de `activity_segment.area` son los sitios de la interfaz y se nombran como ella (`lib/i18n/*/labels.ts`, `area`): `home` Inicio, `inbox` Inbox, `board` Tablón, `polish` Pulido, `system` Sistema, `sheet` Ficha, `search` Búsqueda, `directory` Recursos, `examples` Ejemplos, `skills` Skills, `add` Añadir, `settings`, `team`, `plans`, `extension`, `admin` Actividad, `design-system` Sistema de diseño, `mcp` Conector. `InspoClient.tsx` decide el área por el proyecto y su vista (`projectView`), el espacio y la ficha abierta; `/library` y `/mcp/authorize` mandan su latido con `ActivityPing`. Los códigos viejos no se migran: `lib/activity.ts` funde `library` en `board` y `design-md` en `sheet` al agregar, así las horas de antes siguen contando y no salen filas con nombres retirados. Cada sitio tiene su miniatura en `app/admin/AreaThumb.tsx`.

**Por qué.** Eric, viendo el panel: "tenemos que mejorar el nombramiento de estos espacios por tablón, pulir, sistema y demás cosas nuevas que hemos llamado". Interpretación nuestra: el panel es para el equipo y tiene que hablar con las mismas palabras que la barra lateral y la Isla; un nombre retirado (DESIGN.md, Biblioteca) en una gráfica de uso despista.

**Cómo aplicarlo.** Un sitio nuevo de la interfaz (vista, espacio, página) es un código nuevo de área con su etiqueta en los dos idiomas y su miniatura, en el mismo cambio que lo crea. Si se renombra un sitio, se renombra su etiqueta, no su código; si se retira, su código se funde en el que lo sustituye en `LEGACY_AREA`, nunca se deja una fila con el nombre viejo.
