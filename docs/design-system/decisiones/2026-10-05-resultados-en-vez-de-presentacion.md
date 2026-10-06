---
title: La pestaña Presentación pasa a ser Resultados, y cada bloque es una pieza del tablero
date: 2026-10-05
status: retirada
kind: producto
supersedes: El Sistema abre como presentación de marca (05-10), en la parte de la pestaña
---
**Contexto.** La pestaña Sistema tenía dos vistas: criterio.md y una guía de marca visual (logo, color, tipografía, maquetas) con sus propios valores. En el debate del 05-10 en Brain Training, Eric y Alberto acordaron que el entregable es el MD y dejaron la "presentación" a fermentar como un sitio abierto donde el equipo deja lo que ha hecho, "como un Notion"; Alberto propuso Tiptap para escribirlo.

**Decisión.** La segunda pestaña se llama **Resultados** (`components/ResultsView.tsx`, `.res`). Es una página de bloques, uno debajo de otro, y cada bloque es una referencia del proyecto marcada como resultado (`project_item.result_at`, `lib/projects.ts` `markResults`): un texto se escribe en el sitio con Tiptap y se guarda en la propia referencia; una imagen o un enlace son la referencia tal cual. Abajo se escribe el siguiente: palabras, un enlace pegado solo o una referencia del tablero (la imagen pegada o soltada se corrigió el mismo día: va dentro del texto, ver `2026-10-05-imagen-dentro-del-resultado.md`). No hay documento aparte: el tablero guarda cada pieza y `criterio.md` las cita en la sección "Resultados" (`lib/criterio-md.ts`). El agente tiene la misma acción (`result` en `lib/agent.ts`). La guía de marca sale de la vista; su código (`components/brand/`, `types/brand.ts`), las tablas de valores en el MD, "Importar marca" y el enlace compartido siguen como estaban.

**Por qué.** Eric: "Tiptap me parece bien, siempre que lo que edites se guarde como esas piezas del tablero y no como un documento libre. Si no, vuelves al problema de las dos fuentes de verdad." Y sobre el nombre: "igual hay que llamarlo diferente". En el debate: "no un sistema de branding visual, porque eso te lo hace Claude mejor y a tu gusto"; "ese presentación puede ser algo más abierto [...] totalmente abierto a subir cosas resultantes". Interpretación nuestra: los resultados cierran el paso "learn" del loop, porque lo ya hecho con el criterio es el listón de lo siguiente.

**Cómo aplicarlo.** Nada que se escriba en el proyecto vive en un documento suelto: o es una referencia (con su tipo y su ficha) o es la decisión de un área. Una vista nueva sobre el proyecto lee y escribe esas piezas. Quitar un resultado lo devuelve a referencia normal y sigue en el tablero; se dice en el propio botón. Queda por decidir con Alberto qué pasa con los valores de marca que ya no tienen dónde editarse a la vista (la pasada que los rellena y el enlace compartido).
