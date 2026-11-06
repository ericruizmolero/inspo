---
title: El enlace de un proyecto comparte también su tablón, en una pestaña junto a la marca
date: 2026-11-06
status: vigente
kind: producto
---
**Contexto.** El enlace `/s/<token>` solo enseñaba la marca del proyecto (la presentación y `criterio.md`), y se creaba desde el menú de Sistema. Eric: "podria ser interesante que se pueda compartir publicamente un tablon de un proyecto... que se cree un enlace para gente".

**Decisión.**
- Un solo enlace por proyecto para las dos cosas. `app/s/[token]` lleva arriba el nombre del proyecto y un `SegmentedControl` de papel s con **Tablón** y **Sistema** (`components/brand/SharePage.tsx`, `.share-head`). Abre en la marca si el proyecto la tiene, como hacían los enlaces anteriores, y si no en el tablón. `?view=board|system` fija la pestaña.
- El tablón compartido (`components/brand/ShareBoard.tsx`, `.sboard`) es de solo lectura, con columnas de CSS y lo más reciente primero. Cada tarjeta abre su original. Lo traído de X o Pinterest sale sin imagen, con su nombre y su enlace (`staysInside`, como ya hacía la marca). Una imagen que no carga deja la tarjeta con su nombre, sin hueco. Un texto pegado enseña sus palabras y no enlaza a nada.
- El modo del enlace decide lo que se ve: **Limpio** enseña solo las referencias; **Todo** añade bajo cada tarjeta quién la guardó y su nota (`.tile__note`). Los comentarios no salen nunca. Los datos salen de `loadShareView` (`board` en `lib/share-view.ts`), el mismo sitio que ya limita qué ficheros sirve el enlace.
- "Compartir" está también en el menú ⌄ de la pestaña del proyecto en la Isla y abre el mismo `ShareDialog`, que ahora se titula "Compartir el proyecto".

**Por qué.** Eric eligió un solo enlace con pestañas frente a un enlace por vista, y que lo que se ve de las tarjetas lo decida el modo del enlace. Las dos cosas reutilizan lo que ya existía (tabla `system_share`, modos, ruta de ficheros) sin migración.

**Cómo aplicarlo.** Lo que se enseñe sin sesión de un proyecto sale de `loadShareView` y respeta el modo del enlace y `staysInside`. Una vista nueva de un proyecto compartido es otra pestaña del mismo enlace, no un enlace nuevo.
