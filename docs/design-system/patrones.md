# Patrones

Cómo resolvemos problemas que se repiten. Cada patrón enlaza la decisión que lo fijó.

## Movimiento: qué herramienta para qué

| Caso | Herramienta | Ejemplo |
| --- | --- | --- |
| Hover, pulsar, entradas cortas | CSS con las curvas de los tokens | `.btn:active { scale(0.96) }`, `pop-in` |
| Muchas piezas que cambian de sitio | Transición CSS de `transform` sobre posiciones calculadas | Tarjetas del tablero (`Grid.tsx`) |
| Una pieza que nace de un punto | WAAPI (`el.animate`) | La ficha crece desde donde se pulsó (`ItemPanel.tsx`) |
| Cascadas de palabras, gestos | GSAP | Placeholder rotativo de `ProjectChooser` |
| Cambio de vista completo | View Transitions | Abrir un área en `SystemView` (≥801 px) |

Reglas: animar `transform` y `opacity`, nunca anchos ni altos por frame; si hay que medir, medir todo antes de animar; nada de GSAP Flip sobre muchos elementos (1,5 s de congelación con 286 tarjetas); respetar `prefers-reduced-motion` (se deja solo el fundido). Si se usa `clearProps` de GSAP, nunca `"all"`. → [cortina](decisiones/2026-09-24-cortina-sidebar-waapi.md), [tablero](decisiones/2026-10-01-masonry-ventanada-sin-flip.md)

## Listas largas

- **El layout son números**: columna y desplazamiento salen del ratio de cada tarjeta (índice o medida previa); ninguna tarjeta se mide para colocarse.
- **Ventanado**: solo se montan las tarjetas a ±1 pantalla del viewport; un tablero de 3000 cuesta lo que unas pocas pantallas.
- **Tres copias de cada captura** (288, 720 y 1440 px): cada tarjeta pide la que su ancho en pantalla necesita.
- Componentes de lista memoizados con handlers por ref para no re-renderizar 100+ tarjetas.

## Zoom del tablero

Zoom = pasos de columnas (base 360 px de columna = 100 %; el tablero abre un paso más lejos, `DEFAULT_ZOOM = -1`, para ver más de golpe), control `.board-zoom` `− % +` abajo a la izquierda, clic en el % vuelve a 100, pellizco o ⌘/Ctrl+rueda. Scroll vertical, nunca lienzo infinito. → [grid en vez de canvas](decisiones/2026-10-03-grid-en-vez-de-canvas.md)

## Acciones: a mano o por el agente

Cada acción de la app existe como botón **y** como acción del agente (`lib/agent.ts`), ejecutadas por las mismas funciones. Lo destructivo vuelve como `pending` con "Hazlo / Déjalo". Si el agente duda entre dos lecturas, pregunta. → [decisión](decisiones/2026-10-02-todo-a-mano-o-por-agente.md)

## Edición

- Texto editable en el sitio, sin botón Editar ni recuadro; autoguardado. En criterio.md lo es todo, títulos incluidos. → [decisión](decisiones/2026-10-05-todo-el-md-editable.md)
- Comentar es una herramienta aparte (tecla C) que deja pines tipo Figma con respuestas, en el documento. No hay anotaciones posicionales sobre las páginas de referencia.

## Confirmaciones y vacíos

- Confirmar solo lo que destruye o saca algo (`useConfirm`). Sacar de un proyecto = vuelve al Inbox, nunca se borra ni se archiva en silencio; hay que decirlo donde se decide.
- Un estado vacío ayuda a empezar (qué hacer y con qué), no es solo un "No hay nada".

## Texto generado por IA

Ver principio 18. Además: en el idioma del equipo, frases que se lean de golpe, nada de la spec entera en la primera vista.

## Páginas públicas

Sin IA, sin descargas de blobs ni análisis de imágenes al renderizar. Lo precomputado va en build, script o segundo plano. → [login instantáneo](decisiones/2026-09-22-login-sin-trabajo-pesado.md)
