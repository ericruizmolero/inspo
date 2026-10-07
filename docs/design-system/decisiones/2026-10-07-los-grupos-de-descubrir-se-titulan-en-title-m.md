---
title: Los grupos de Descubrir se titulan en title-m, no en title-l
date: 2026-10-07
status: vigente
kind: diseño
---
**Contexto.** En Recursos y Skills cada grupo (por ejemplo "DESIGN.md para agentes" o "Tipografía, color y layout") lleva un `h2`, que por nivel se pinta en title-l (28 px, Bricolage 700). Sobre filas y tarjetas de 13 a 15 px, y bajo el `h1` de la página, el título del grupo pesaba más que lo que agrupa.

**Decisión.** Los `h2` de `.disc-list__head` (`components/Discover.tsx` y `components/DiscoverSkills.tsx`) llevan `.t-title-m` (20 px): siguen siendo `h2` para el esquema de la página y los lectores de pantalla, solo cambia el aspecto, como manda fundamentos ("la clase, solo si el aspecto debe ser otro que el nivel"). La entradilla del grupo (`p`, `--fs-small`) no cambia. Para que el grupo siga un escalón por encima de lo que agrupa, el nombre de cada tarjeta de skill (`.disc-skill__name`) baja de title-m a title-s (16).

**Por qué.** Eric, 07-10: "aquí los titles son muy grandes de tamaños". Interpretación: title-l es para el título de una página o de una sección entera; un grupo dentro de una lista es un escalón menos.

**Cómo aplicarlo.** Dentro de una página con `h1`, los encabezados de grupo de una lista o cuadrícula van en title-m y los nombres de sus tarjetas en title-s. title-l queda para el título de una sección que ocupa la pantalla.
