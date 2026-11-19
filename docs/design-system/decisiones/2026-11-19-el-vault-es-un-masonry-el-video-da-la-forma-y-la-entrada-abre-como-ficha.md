---
title: El Vault es un masonry, el vídeo da la forma a la tarjeta y la entrada abre como ficha
date: 2026-11-19
status: vigente
kind: diseño
---
**Contexto.** Con las dos primeras piezas oficiales subidas (Brick Helix Work Index y Cascading Case Slider), sus vídeos de Screen Studio salían recortados: toda tarjeta era 4:3 y la caja de la entrada 16:10, fuera cual fuera el tamaño de la grabación. El vídeo solo se movía al pasar el ratón, la entrada abría como una página aparte dentro de Descubrir, y lo que entraba por el conector quedaba en borrador hasta pedir `publish: true`.

**Decisión.**
- La tarjeta con vídeo toma la proporción del vídeo (`shapeOf` en `components/Vault.tsx`, entre 0,6 y 2,4 de ancho sobre alto); sin vídeo sigue en 4:3, que es como se captura y corre la pieza. La proporción se lee del propio MP4 al guardarlo (`videoRatioOf` en `lib/vault.ts`, columna `vault_item.video_ratio`); si el fichero no la dice (un WebM, o un vídeo anterior a esto), la mide el navegador al cargarlo.
- La rejilla es un masonry (`.vault-grid` con columnas `.vault-col`): tantas columnas como quepan a 300 px o más, y cada tarjeta, en el orden de la lista, va a la columna más corta. Las alturas se saben antes de cargar nada, así que no hay saltos.
- El vídeo de una tarjeta va siempre en bucle mientras la tarjeta está en pantalla (`LoopVideo`, el mismo del tablón), sin depender del ratón. La pieza en vivo sigue arrancando al pasar el ratón.
- La entrada abre como ficha sobre la rejilla, con el visor del tablón (`.ip`, `.cr-viewer`): la pieza en el escenario, a la proporción de su vídeo o llenándolo si corre en vivo, y a la derecha lo que es, quién la subió, las acciones, los datos y las etiquetas. Para socios, el escenario tiene una segunda vista, "Documentación". Crece desde la tarjeta pulsada y cierra con Esc, el velo o la cruz (`growFromPress` y `shrinkAway`, sacados de `ItemPanel`).
- Una entrada nueva escrita por el conector (`add_to_vault`) se publica al momento; solo `publish: false` la deja en borrador. En una actualización, lo no dicho se queda como estaba.

**Por qué.** Eric, 19-11: "tenemos que adaptar el ratio de las cards en función del tamaño que tengan los vídeos de Screen Studio, al igual que en tablón se adaptan las cards al contenido", "hacerlo preparado para masonry", "los vídeos de Screen Studio quiero que sea siempre en loop, que ya no dependa del hovering", "aquí también el ratio se tiene que adaptar", "igual en vez de abrir esta página cada card puede abrirse una ficha como tenemos en tablón", "de MCP no entren en borrador, que entren directamente oficial". Lo de dejar la documentación como segunda vista del escenario es interpretación nuestra: en una columna de 380 px el código no se lee.

**Cómo aplicarlo.** Un vídeo se graba a la forma que pida la pieza, no a 4:3. Lo que se abre desde una tarjeta, en cualquier vista, abre como ficha con el visor del tablón, no como página nueva. Una altura que decide el masonry tiene que saberse antes de cargar el contenido: se guarda con el dato.
