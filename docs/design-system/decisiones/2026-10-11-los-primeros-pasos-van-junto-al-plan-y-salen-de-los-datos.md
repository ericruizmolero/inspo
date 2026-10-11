---
title: Los primeros pasos van junto al medidor del plan y su progreso sale de los datos
date: 2026-10-11
status: vigente
kind: producto
---
**Contexto.** Una cuenta nueva no tenía camino del registro al primer criterio.md (#103). Los ejemplos ya están en cada espacio (`ensureBuiltinTemplates`) y no cuentan para el tope de referencias; faltaba que alguien los viera y supiera qué hacer después.

**Decisión.**
- Seis pasos, en este orden: abrir un ejemplo, crear un proyecto, escribir qué es (`brief.about`), guardar 10 referencias en él, la primera pasada del Sistema y llevarse criterio.md (copiarlo, descargarlo, compartirlo o conectar un cliente MCP). Viven en la tabla `STEPS` de `lib/first-steps-core.ts`; el paso de ahora es el primero que falta.
- El progreso se deriva de filas que la app ya escribe (`lib/first-steps.ts`); no hay tabla de lista. Solo se añaden dos columnas: `project_system.exported_at` (la primera copia o descarga) y `user.first_steps_done_at` (ocultada o completada).
- Se muestra como lista callada (`FirstSteps`) sobre el `PlanMeter`: en el menú del espacio de la Isla y al pie de la barra lateral del móvil. Sin modal, sin tour, sin aviso propio.
- Ocultar es por persona y para siempre. Completar los seis pasos la oculta igual, para que borrar un proyecto después no la traiga de vuelta.

**Por qué.** Los pasos, el modelo de datos y la condición de no guardar una lista los fijó el lead del #103. El sitio lo eligió el delegado entre los dos que propuso el lead (pie junto al plan, o dentro de `EmptyStart` / `ProjectStart`): junto al plan es el único sitio que existe en todos los pasos y en escritorio y móvil, y se relee cada vez que se abre, como el medidor. Que una clave de la extensión no cuente como salida también es interpretación nuestra: se crea al instalarla para guardar referencias, antes de que exista un criterio.md.

**Cómo aplicarlo.** Un paso nuevo es una fila de `STEPS` y un campo de `FirstSteps` leído de datos que ya existan; si no existen, la señal más pequeña posible en la tabla que le toca, nunca una fila de lista. En escritorio la lista vive dentro de un menú cerrado: si hace falta que se vea sin abrirlo, se decide aparte.
