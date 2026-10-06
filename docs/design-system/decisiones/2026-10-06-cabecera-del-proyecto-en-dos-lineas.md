---
title: La cabecera del proyecto va en dos líneas y sus tres vistas en una sola fila de pestañas
date: 2026-10-06
status: vigente
kind: diseño
---
**Contexto.** La cabecera de la vista Sistema ponía el nombre del proyecto y los controles en la misma fila: con un nombre largo ("Home de API para developers · Zernio") los controles caían a una segunda línea pegados a la derecha, y debajo venían dos filas más de pestañas (criterio.md / Resultados, y Markdown / Documento) antes del fichero. "criterio.md" aparecía tres veces. Eric, 05-10: "resuelve el layout" y "lo de traer y compartir no sé yo".

**Decisión.** `.spage-head` es una columna: el nombre arriba y debajo una sola fila (`.spage-bar`), del ancho de la columna del fichero, con las pestañas a la izquierda y las acciones a la derecha. Tres pestañas planas: **Markdown**, **Documento** y **Resultados**; el conmutador de aspecto deja de vivir en `SystemDoc` y la pestaña recordada en el navegador sigue siendo solo "fichero o Resultados" (el fichero abre siempre como Markdown). A la derecha: **Mejorar con IA** (única primaria) y un menú "…" con "Traer una marca que ya existe" y "Compartir la marca", que salen de la fila sin retirarse. Por debajo de 900 px la barra del fichero pasa a dos líneas en vez de empujar el panel fuera de la página.

**Por qué.** Principio 9, menos elementos y cada uno pulido, y 17, menos sitios para lo mismo: tres filas de pestañas para un fichero eran dos de más. Traer y Compartir se guardan en el menú porque la decisión de Resultados dejó pendiente con Alberto qué pasa con los valores de marca y el enlace compartido; retirarlos del todo es un "…" menos. Eric lo dio por bueno ("Vale") el 05-10.

**Cómo aplicarlo.** Una cabecera de página con título y controles va en dos líneas, nunca compartiendo fila con un título que puede ser largo. Las vistas de una misma cosa van en una sola fila de pestañas, no anidadas. Lo que se pide de vez en cuando va a un "…", no a la fila.
