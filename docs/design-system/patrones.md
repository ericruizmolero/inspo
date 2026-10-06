# Patrones

Cómo resolvemos problemas que se repiten. Cada patrón enlaza la decisión que lo fijó.

## Movimiento: qué herramienta para qué

| Caso | Herramienta | Ejemplo |
| --- | --- | --- |
| Hover, pulsar, entradas cortas | CSS con las curvas de los tokens | `.btn:active { scale(0.96) }`, `pop-in` |
| Muchas piezas que cambian de sitio | Transición CSS de `transform` sobre posiciones calculadas | Tarjetas del tablero (`Grid.tsx`) |
| Una pieza que nace de un punto | WAAPI (`el.animate`) | La ficha crece desde donde se pulsó (`ItemPanel.tsx`) |
| El hover de un grupo de pestañas, que pasa de una a otra | WAAPI: una pastilla aparte, de la posición medida a la nueva, con `transform` muestreado para que un borde llegue antes que el otro. La elegida no se anima | `Liquid` (`components/ui/liquid.tsx`) → [decisión](decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md) |
| Un clic que abre una vista pesada | Pintar primero la respuesta (el relleno en la pestaña) y lanzar el trabajo después de ese fotograma | `afterPaint` (`components/ui/liquid.tsx`) |
| Algo que sigue al puntero | `requestAnimationFrame` con suavizado y WAAPI para entrar y salir | La miniatura de Descubrir (`Discover.tsx`) → [decisión](decisiones/2026-10-05-miniatura-descubrir-sin-gsap.md) |
| Llevar la página a una parte (índice) | `requestAnimationFrame` sobre el `scrollTop` del contenedor, releyendo el destino en cada frame | El índice de criterio.md (`go` en `SystemDoc.tsx`) → [decisión](decisiones/2026-10-06-indice-baja-con-scroll-propio.md) |
| Muchas piezas en 3D que giran sin parar | Un bucle `requestAnimationFrame` que escribe `transform` en cada pieza, ventaneado, con el desenfoque en pasos de medio píxel | El tornado de Pulido (`PolishView.tsx`) → [decisión](decisiones/2026-10-06-vuelve-pulido-como-fase-entre-tablon-y-sistema.md) |
| Algo que cambia de sitio en la app (sale de un proyecto, se queda en él) | WAAPI: la pieza vuela hasta la pestaña de su destino, que da un pequeño bote | Conservar y Olvidar en Pulido (`Flyer` en `PolishView.tsx`); en equipo el voto vuela a la pestaña Pulido, porque la tarjeta aún no va a ningún sitio → [decisión](decisiones/2026-10-06-en-pulido-la-tarjeta-decidida-vuela-a-su-pestana.md) |
| Cambio de vista completo | View Transitions | Abrir un área en `SystemView` (≥801 px) |

Reglas: animar `transform` y `opacity`, nunca anchos ni altos por frame; si hay que medir, medir todo antes de animar; nada de GSAP Flip sobre muchos elementos (1,5 s de congelación con 286 tarjetas); respetar `prefers-reduced-motion` (se deja solo el fundido). GSAP ya no está en el proyecto. → [cortina](decisiones/2026-09-24-cortina-sidebar-waapi.md), [tablero](decisiones/2026-10-01-masonry-ventanada-sin-flip.md)

## Listas largas

- **El layout son números**: columna y desplazamiento salen del ratio de cada tarjeta (índice o medida previa); ninguna tarjeta se mide para colocarse.
- **Ventanado**: solo se montan las tarjetas a ±1 pantalla del viewport; un tablero de 3000 cuesta lo que unas pocas pantallas.
- **Tres copias de cada captura** (288, 720 y 1440 px): cada tarjeta pide la que su ancho en pantalla necesita.
- El React Compiler memoiza; que un sondeo, el teclado o un panel no re-rendericen el tablero entero (Alberto, 05-10).

## Zoom del tablero

Zoom = pasos de columnas (base 360 px de columna = 100 %; el tablero abre un paso más lejos, `DEFAULT_ZOOM = -1`, para ver más de golpe), control `ZoomPill` (`.zoom-pill`, `− % +`) abajo a la izquierda, clic en el % vuelve a 100, pellizco o ⌘/Ctrl+rueda. Scroll vertical, nunca lienzo infinito. → [grid en vez de canvas](decisiones/2026-10-03-grid-en-vez-de-canvas.md)

Pulido tiene el mismo control en la misma esquina, con los mismos gestos: allí el zoom es el tamaño del tornado, no columnas. La pastilla lleva también la música, y donde no hay zoom (Sistema, Descubrir, Ajustes) es el altavoz solo: está en toda la app con sesión iniciada. → [zoom y música en la misma pastilla](decisiones/2026-10-06-zoom-y-musica-comparten-la-pastilla-de-la-esquina.md)

## Acciones: a mano o por el agente

Cada acción de la app existe como botón **y** como acción del agente (`lib/agent.ts`), ejecutadas por las mismas funciones. Lo destructivo vuelve como `pending` con "Hazlo / Déjalo". Si el agente duda entre dos lecturas, pregunta. → [decisión](decisiones/2026-10-02-todo-a-mano-o-por-agente.md)

## Edición

- Texto editable en el sitio, sin botón Editar ni recuadro; autoguardado. En criterio.md lo es todo, títulos incluidos. → [decisión](decisiones/2026-10-05-todo-el-md-editable.md)
- Lo que se escribe en un proyecto es siempre una pieza del tablero (una referencia o la decisión de un área), nunca un documento suelto: así hay una sola fuente de verdad y el MD se deriva de ella. → [decisión](decisiones/2026-10-05-resultados-en-vez-de-presentacion.md)
- Lo mismo para un cliente de IA conectado por MCP: lee el MD, escribe piezas, y una decisión suya es una propuesta que espera al equipo. Lo que viene de fuera dice de dónde viene ("Eric vía Claude"). → [decisión](decisiones/2026-10-06-conector-mcp-lee-el-md-y-escribe-piezas.md)
- Comentar es una herramienta aparte (tecla C) que deja pines tipo Figma con respuestas, en el documento. No hay anotaciones posicionales sobre las páginas de referencia.

## Confirmaciones y vacíos

- Confirmar solo lo que destruye o saca algo (`useConfirm`). Sacar de un proyecto = vuelve al Inbox, nunca se borra ni se archiva en silencio; hay que decirlo donde se decide.
- Un estado vacío ayuda a empezar (qué hacer y con qué), no es solo un "No hay nada".

## Texto generado por IA

Ver principio 18. Además: en el idioma del equipo, frases que se lean de golpe, nada de la spec entera en la primera vista.

## Páginas públicas

Sin IA, sin descargas de blobs ni análisis de imágenes al renderizar. Lo precomputado va en build, script o segundo plano. → [login instantáneo](decisiones/2026-09-22-login-sin-trabajo-pesado.md)
