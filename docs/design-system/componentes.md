# Componentes

Cada pieza de la app con su nombre en castellano (el que usamos al hablar), su nombre técnico, su fichero y lo que hay que saber para usarla. Antes de crear algo, búscalo aquí; si creas una pieza reutilizable, añade su ficha.

## Comunes

### Botón
`Button` · `components/ui/button.tsx` · `.btn` · muestra: botones
Botón de Base UI cuyas variantes se traducen a las clases globales de `app/globals.css`. Se usa en unos 27 ficheros.
- Variantes: `default` (`.btn`, 36 px, fondo `--surface`, sin borde), `primary` (`.btn--primary`, una por vista), `ghost` (`.btn--ghost`, evitar), `icon` (`.btn-icon`).
- Tamaños: `default` y `sm` (`.btn--sm`, 30 px); `block` ocupa todo el ancho.
- Peligro: `.btn.is-danger` (texto) y `.is-danger-solid` (relleno).
- Pulsar encoge a 0.96; desactivado baja a 0.4 de opacidad.

### Botón de icono
`.btn-icon` · `app/globals.css` · muestra: boton-icono
32 px, transparente, icono en `--muted` que pasa a `--text` con fondo `--surface-2` al pasar el ratón. Siempre con `aria-label`.

### Campo de texto
`Input` · `components/ui/input.tsx` · `.input` · muestra: campo
38 px, radio 10, padding 12. El placeholder en tema claro va en `--muted` a opacidad completa para que se lea.

### Logotipo
`Logo` · `components/Logo.tsx` · `.logo` · muestra: logo
La marca en SVG; sustituye al nombre en la interfaz (el nombre va en el `alt`). Baldosa oscura que se funde con el tema oscuro y se lee como icono de app en el claro. 28 px en la barra superior.

### Isla
`Island` · `components/Island.tsx` · `.island` · captura: isla
Barra flotante de escritorio con los proyectos como pestañas, a lo Figma: Inicio (la casa), Descubrir, Inbox, "N más", "+" para proyecto nuevo y, a la izquierda, el avatar del espacio que abre el menú de espacio.
- Las pestañas abiertas se guardan por navegador y espacio; el ancho se mide con un `.island__measure` oculto.
- El relleno de la pestaña activa y el del hover son las pastillas de `Liquid`, sin borde: la del hover fluye de una pestaña a otra y la activa aparece en el mismo clic. → [decisión](decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md)
- La pestaña activa lleva ⌄ (renombrar, borrar) y × (cerrar pestaña); el × ocupa el sitio del anillo de progreso.
- Renombrar en el sitio: Enter guarda, Esc cancela. Proyecto nuevo: ⌘/Ctrl+Enter.
- Se oculta a ≤800 px; en móvil navega la barra lateral. z 20 dentro de `.topbar`.

### Menú de espacio y avatares
`WorkspaceMenu` · `WorkspaceAvatar` · `UserAvatar` · `components/WorkspaceMenu.tsx` · `.ws`
Popover para cambiar de espacio (al instante dentro de la biblioteca), crear equipo y entrar en Ajustes, Actividad y Sistema de diseño (estos dos, solo socios).
- Desde la Isla lleva además el equipo en una fila de caras solapadas (`.island__team`: cada cara filtra por quién guardó, las que no caben se cuentan en un "+N", "Gestionar" al final), el directorio, el feedback y el plan en una línea (`PlanMeter` con `compact`: "146/2.000 IA", las acciones de IA del mes, que se releen al abrir el menú). → [qué cuenta](decisiones/2026-10-06-el-plan-cuenta-acciones-de-ia.md) No lista proyectos: son las pestañas de la Isla.
- Cuelga siempre debajo de lo que lo abre y nunca mide más que el hueco de la ventana (`--available-height`); si no cabe, hace scroll por dentro. → [decisión](decisiones/2026-10-06-el-menu-de-espacio-no-lista-proyectos-y-el-equipo-son-caras.md)
- `WorkspaceAvatar` es cuadrado (logo o inicial); `UserAvatar` es redondo (foto o inicial).

### Paleta de comandos
`CommandPalette` · `components/CommandPalette.tsx` · `.cp` · captura: paleta
Diálogo cmdk con ⌘K / Ctrl+K: guardar la URL tecleada, añadir referencia, directorio, feedback, abrir referencias, cambiar de espacio, ajustes, actividad y sistema de diseño.
- Se carga en diferido y se monta tras el primer uso.

### Diálogo
`Dialog` · `components/ui/dialog.tsx` · `.modal`
Diálogo de Base UI. Tamaños `sm` y `lg`; el título lleva `.display.modal__title`. Fondo `.modal-backdrop` en z 200.
- Lo usan: añadir referencia, Mejorar con IA, crear equipo, directorio, paleta.

### Confirmación
`useConfirm` · `components/useConfirm.tsx` · `AlertDialog`
`confirm()` con promesa: `const [confirm, dialog] = useConfirm()`. Solo para lo que destruye o saca algo. Con `typed`, la acción espera a que se escriba ese nombre: para lo que se lleva el trabajo de otras personas (eliminar un equipo). → [decisión](decisiones/2026-10-06-los-espacios-se-eligen-en-una-lista-para-salir-o-eliminar.md)

### Popover
`Popover` · `components/ui/popover.tsx` · `.pp` · `.pp--menu`
Menú flotante de Base UI (posicionador en z 55). Las filas usan `.ws__item`. Es la base de los selectores de proyecto y área, del menú de skills, del menú del fichero y de los menús "…".

### Barra lateral
`AppSidebar` · `components/Sidebar.tsx` · `.app-sidebar` · `.nav-item`
Navegación sobre el sidebar de shadcn: añadir, Todo, Inbox, proyectos, directorio con 7 picks barajables, feedback, cambiar tema y medidor del plan. **Solo se monta en móvil**; en escritorio navega la Isla. ⌘B / Ctrl+B la pliega.
- Exporta piezas que se usan fuera: `Icons` (iconos de 16 px), `FillRing` (anillo de progreso del sistema, en Isla y selector de proyectos), `PlanMeter`, `SearchBox`.

### Anillo de progreso
`FillRing` · `components/Sidebar.tsx`
Anillo que dice cuánto del sistema de un proyecto está decidido. Aparece en las pestañas de la Isla, en las portadas de proyecto y en la barra lateral.

### Iconos de las áreas
`areaIcon` · `components/area-icons.tsx` · `.area-icon` · muestra: iconos-area
Los 8 conceptos del sistema (tipografía, color, layout, movimiento, iconografía, logo, imagen, voz) dibujados a mano: 16 px, trazo 1,5, `currentColor`. Donde se nombra un área, su icono va primero.

### Iconos de sección
`sectionIcon` · `components/section-icons.tsx` · muestra: iconos-seccion
Misma mano que los de área, para las secciones de Ajustes, Actividad y esta librería.

### Avatar de persona
`Avatar` · `hueFor` · `components/CommentsPanel.tsx`
Foto o inicial sobre un tono derivado del nombre. En tarjetas, documento, hilos de área y comentarios.

### Selector de tema
`ThemeSwitch` · `components/ThemeSwitch.tsx` · `.theme-seg` · muestra: segmentado
Control segmentado Sistema / Claro / Oscuro. Aplica `data-theme` al momento, lo guarda en el navegador y sigue `prefers-color-scheme` en vivo. Solo en Ajustes › Cuenta.

### Botón de tema
`ThemeToggle` · `components/ThemeToggle.tsx` · `.theme-float` · `.theme-toggle`
Un clic entre claro y oscuro. En escritorio, un botón de cristal de 36 px que flota en la esquina inferior derecha, a 16 px de cada pared (el mismo margen que la pastilla de la esquina izquierda) y apagado hasta que se acerca el puntero; en móvil, la fila "Cambiar tema" al pie de la barra lateral. Enseña el tema al que lleva (sol en oscuro, luna en claro). El cambio funde la página entera en 600 ms (`switchTheme`). No ofrece "Sistema": eso sigue en el selector de Ajustes. → [decisión](decisiones/2026-10-06-boton-de-tema-flotante-en-la-esquina.md)

### Selector de idioma
`LangSwitch` · `components/LangSwitch.tsx` · `.select`
Cada idioma escrito en su propio nombre. Guarda cookie y cuenta, y vuelve a pintar en el servidor.

### Herramienta de feedback
`FeedbackTool` · `FeedbackEntry` · `components/FeedbackTool.tsx` · `.fb-dock`
Capa sobre Agentation: píldora "Dar feedback", panel de 3 pasos y "Enviar al equipo". El dock se arrastra y recuerda su sitio. z 100000, siempre encima. `FeedbackEntry` es su entrada al pie de las barras laterales. La barra de Agentation vive en un shadow root y se maneja desde `components/feedback-mode.ts`; su versión va fija. → [decisión](decisiones/2026-10-06-la-herramienta-de-feedback-va-con-version-fija.md)

### Esqueleto
`.sk` · `app/globals.css` · muestra: skeleton
Brillo que recorre una superficie mientras carga (`shimmer`, 1.6 s). Lo que espera ocupa ya su forma final.

### Relleno líquido de pestañas
`Liquid` · `afterPaint` · `components/ui/liquid.tsx` · `.liquid` · `.liquid__pill`
Envuelve un grupo de pestañas y pinta sus rellenos como dos pastillas: la del hover fluye de pestaña en pestaña siguiendo al puntero; la de la elegida no viaja, salta a la pestaña en el mismo clic, con el texto ya en su color. Lee la elegida del DOM (`aria-selected`, `aria-pressed` o `on`) y acepta `as` (`div`, `nav`, `span`). `afterPaint` lanza lo que abre el clic después de pintar ese fotograma, para las vistas pesadas. Colores por control con `--liquid-on`, `--liquid-hover`, `--liquid-ring`, `--liquid-ink` y `--liquid-ink-off`. Lo usan los controles segmentados, Tablón / Pulido / Sistema y la Isla. → [decisión](decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md)

### Pastilla de la esquina: zoom y música
`ZoomPill` · `components/ZoomPill.tsx` · `.zoom-pill` · `SoundControl` · `components/SoundControl.tsx`
La única pieza que flota abajo a la izquierda, a 16 px de cada pared (como el botón de tema en la esquina contraria), en toda la app con sesión iniciada, la casa incluida; antes de iniciar sesión (portada de invitado, login) no está (`.board-zoom` en los tablones y las demás vistas, `.polish__corner` en Pulido, `.shell-corner` en Ajustes, biblioteca de diseño y actividad). → [decisión](decisiones/2026-10-06-zoom-y-musica-comparten-la-pastilla-de-la-esquina.md)
- Zoom (− % +): columnas en los tablones, tamaño del tornado en Pulido; las demás vistas no tienen (`zoom={null}`) y la pastilla es el altavoz solo.
- Música, tras una línea fina: el altavoz (`.zoom-pill__sound`) enciende y apaga con un clic; mientras suena, la flecha (`.zoom-pill__track`) abre las canciones por nombre (`.sound-tracks`, un menú `.island-pop` en el cristal de la pastilla) y gira con él: 200 ms al abrir, 150 al cerrar (Eric, 06-10: "que gire acompasado"). Seis pistas en `public/polish/` (lista `TRACKS`), que no se descargan hasta encenderla; entra y sale con fundido y al acabar una sigue la siguiente. → [las pistas](decisiones/2026-10-06-la-musica-de-pulido-se-elige-por-nombre.md)
- Siempre arranca apagada al abrir o recargar la página; solo se recuerda la última canción.
- El audio es uno para toda la página y no se corta al cambiar de pantalla ni de pestaña del navegador (sigue sonando en segundo plano). Suena solo mientras uno de sus botones está en pantalla.
- En móvil solo Pulido la tiene, arriba bajo la barra.

### Pastilla y control segmentado
`.ds-pill` · `.ds-seg` · `components/design-library/DesignLibrary.css` · muestra: pastillas
Etiqueta de estado sin borde (relleno al 16 % del color de estado) y grupo de opciones con la elegida en relleno. Hoy viven en esta librería; candidatas a subir a `globals.css` si se usan fuera.

## Biblioteca y tablero

### Biblioteca
`InspoClient` · `components/InspoClient.tsx` · `.shell` · `.topbar` · `.dock`
La app: barra superior (Isla, logo, acciones), selector Tablón / Pulido / Sistema, el "+" y, abajo, el dock con la barra de reunir, la respuesta del agente y el buscador. Según el espacio activo enruta a Descubrir, Inicio, Inbox, tablero, Pulido o Sistema.
- Atajos: ⌘K paleta, N añadir, "/" buscador (o sobre una tarjeta, entregarla al agente).

### Respuesta del agente
`AgentCard` · `components/InspoClient.tsx` · `.dock__agent`
Lo que el agente hizo, con deshacer; sus preguntas con opciones; y lo destructivo pendiente con Hazlo / Déjalo.

### Tablero
`Grid` · `components/Grid.tsx` · `.board` · captura: tablero
Masonry con scroll vertical. El layout son números (ratio de cada tarjeta) y solo se montan las tarjetas cercanas a la pantalla.
- Zoom por columnas: `ZoomPill` (`components/ZoomPill.tsx`, `.zoom-pill`: − % +), colocada por `.board-zoom` en la esquina inferior izquierda, a 16 px de cada pared; pellizco o ⌘/Ctrl+rueda. Abre un paso más lejos que el 100 %. Pulido usa la misma pastilla en la misma esquina.
- La pastilla lleva también la música (`SoundControl`, ver Pastilla de la esquina), en cualquier tablón.
- Las tarjetas se deslizan a su nuevo sitio con una transición CSS de `transform`.
- Cada tarjeta pide la copia de captura que necesita: 288, 720 o 1440 px.

### Tarjeta de referencia
`InspoCard` · `components/InspoCard.tsx` · `.tile` · captura: tarjeta
La miniatura en su forma real: web (og:image, captura o póster tipográfico), imagen, vídeo en bucle o texto.
- Nota con avatares, chips de etiquetas y estado "reuniendo".
- Abajo: Archivar en proyecto, Al sistema y Comentarios. Al pasar el ratón, la página hace scroll dentro de la tarjeta.
- Arriba a la derecha: Ver URL, los tres puntos (solo la miniatura) y la papelera, que dice de dónde quita la tarjeta. En el tablón de un proyecto dice "Quitar del proyecto", la saca con un clic y la tarjeta vuela a la pestaña Inbox de la Isla como en Pulido (`components/fly-to-inbox.ts`, `.tile-fly`); fuera, "Quitar de" y el nombre del espacio. → [decisión](decisiones/2026-10-06-en-un-proyecto-la-papelera-saca-la-tarjeta-al-inbox.md) Fuera de un proyecto borra: son dos clics seguidos sobre la papelera, que al primero pasa a decir "Borrar" en rojo en el mismo sitio; Esc, sacar el puntero o 6 s lo cancelan. → [decisión](decisiones/2026-10-06-borrar-tarjeta-con-dos-clics-en-la-papelera.md) La papelera solo se pinta para quien puede borrar la referencia: quien la guardó o quien gestiona el espacio (`deletable`). → [decisión](decisiones/2026-10-06-un-miembro-borra-lo-suyo-y-los-admins-el-resto.md)
- Arriba a la izquierda: el círculo de selección (al pasar el ratón o mientras se selecciona) y, tras una búsqueda, el porcentaje de encaje con su porqué. Cuando el círculo aparece, el porcentaje y el chip GIF se apartan 32 px a la derecha. → [decisión](decisiones/2026-10-06-el-estado-de-etiquetado-no-acompana-a-la-busqueda.md)

### Barra de selección
`SelectBar` · `components/SelectBar.tsx` · `.selbar`
Varias referencias a la vez: ⌘ o ⇧-clic en una tarjeta (o su círculo) y la barra ocupa el sitio del dock, con su mismo cristal.
- Cuenta, "Seleccionar todo" (lo que hay en el tablero a la vista; desaparece cuando ya está todo) y Listo.
- En la librería y el Inbox: Añadir a proyecto y Borrar. Borrar pide confirmación con el número de referencias y se lleva también sus comentarios y ficheros. Si la selección lleva referencias de otra persona y quien borra no gestiona el espacio, no se borra a medias: se rechaza entera con un mensaje. → [decisión](decisiones/2026-10-06-un-miembro-borra-lo-suyo-y-los-admins-el-resto.md)
- Dentro de un proyecto: Mover y Quitar (vuelven al Inbox, no se borran).

### Selector de proyecto
`ProjectPicker` · `components/ProjectPicker.tsx` · `.pp-step`
Dos pasos: el proyecto y luego sus 8 áreas, con campo para crear proyecto y archivar a la vez.

### Selector de área
`AreaPicker` · `components/AreaPicker.tsx` · `.pp`
Las 8 áreas, marcadas donde la referencia ya cuenta.

### Añadir referencia
`AddInspoModal` · `components/AddInspoModal.tsx` · `.add` · captura: anadir
Pegar enlace, subir, soltar o pegar con ⌘V una imagen, o pegar texto (varias líneas = referencia de texto). Dentro de un proyecto deja elegir áreas. Se abre con N, el "+" o la paleta.

### Buscador y barra del agente
`SearchBar` · `components/SearchBar.tsx` · `.sb` · captura: dock
Caja fija abajo, con chips de filtro (persona, fecha, color, sección…) y sugerencias que se abren hacia arriba. Enter o ⌘Enter manda la orden al agente.
- Solo sale sobre un tablón con referencias: un proyecto vacío empieza por su propia caja (`ProjectStart`) y no lleva buscador. → [decisión](decisiones/2026-10-06-el-buscador-solo-sale-sobre-un-tablon-con-referencias.md)
- Muestra la tarjeta marcada con "/" como objetivo.
- Esc en cascada: cierra la lista, vacía, quita chips, quita objetivo, suelta el foco.
- A la derecha, mientras se busca, solo acciones: el botón del agente y la equis. El aviso "Etiquetando N referencias" (trabajo en segundo plano) solo sale con la caja vacía. → [decisión](decisiones/2026-10-06-el-estado-de-etiquetado-no-acompana-a-la-busqueda.md)

### Barra de reunir referencias
`GatherBar` · `components/GatherBar.tsx` · `.gather`
Pegada al dock: recuento, tres miniaturas apiladas, "Añadir" y "Ya tengo mis referencias", que marca el proyecto como empezado y lleva siempre al Sistema (no pasa por Pulido, que es una pestaña aparte).

### Pulido
`PolishView` · `components/PolishView.tsx` · `components/PolishView.css` · `.polish`
La fase entre el Tablón y el Sistema (`?view=polish`): lo que queda por decidir del tablón, en un slider con forma de tornado 3D; la tarjeta de delante ocupa más sitio y es la que se decide. → [la fase](decisiones/2026-10-06-vuelve-pulido-como-fase-entre-tablon-y-sistema.md), [cómo se decide](decisiones/2026-10-06-en-pulido-la-tarjeta-decidida-vuela-a-su-pestana.md)
- La matemática es la del "3D cards tornado" de Osmo Supply, en `requestAnimationFrame` y sin GSAP; sus parámetros son las constantes del principio del fichero. Ventaneado: solo se montan las tarjetas cercanas a la pantalla (unas 33 en un tablero de 134).
- Es un slider manual, siempre: se mueve con la rueda, arrastrando o al decidir, y descansa sobre una tarjeta. Cada vez que se entra, la tarjeta de delante es otra, al azar entre las pendientes (`lastFront`). La de delante es una más del tornado, más grande (`FRONT_W` frente a `CARD_W`) y con las vecinas un poco apartadas (`SPREAD`); en reposo carga su captura grande. Clic en ella abre su ficha, sola: sin flechas ni anterior y siguiente, porque el slider aquí es el tornado (`panelAt` en `InspoClient.tsx`); clic en otra la trae delante. → [decisión](decisiones/2026-10-06-en-pulido-la-ficha-se-abre-sola.md)
- Las respuestas (`.polish__bar`, cristal del dock, donde va el dock en el tablón): el pie de la tarjeta de delante (`.polish__now`) y una pieza en dos mitades del mismo peso (`.polish__choice`), **Olvidar** ("Vuelve al Inbox": sale del proyecto, no se borra) y **Conservar** ("Se queda en el tablón"), cada una con la flecha de su tecla. Deshacer aparece al lado cuando hay algo que deshacer. Atajos ← → y ⌘Z.
- El pie dice lo que hace falta para decidir sin abrir la ficha, y cada cosa con la cara de quien la dijo, como bajo una tarjeta del tablón (`.tile__note`): de una web o una imagen, su nombre (`.polish__name`, hasta dos líneas); de un post de X, una fila (`.polish__say`) con el avatar de su autor, su nombre y lo que dice en hasta tres líneas, sin sus enlaces; debajo, lo que dijo el equipo (`.polish__say--note`, dos líneas, más apagado): la nota de quien guardó la referencia o, sin nota, el primer comentario, con su avatar (`Avatar`, 18 px) o las caras apiladas si hay más voces en la conversación (`.polish__faces`). Sale de `captionFor` (`InspoCard.tsx`), el mismo dato que el pie de la tarjeta. Una nota larga se corta: dos líneas a la vista y `NOTE_MAX` (280) caracteres en la página; entera se lee en la ficha. El texto del post se pide a `/api/post` cuando la tarjeta lleva un momento delante (`POST_WAIT`) y se guarda para la sesión (`postWords`); mientras llega se lee el arranque que ya trae el nombre. Sin IA: es lo que ya estaba escrito. Cuántas le quedan a cada persona lo dice la pestaña Pulido de la barra (`.topbar__fill`, como el 0/8 de Sistema), desde cualquier vista del proyecto; nombre y número comparten línea base (`.topbar__label`). → [decisión](decisiones/2026-10-06-el-pie-de-pulido-ensena-el-texto-del-post-y-la-nota.md)
- Decidida, la tarjeta sale del tornado (solo gira lo pendiente) y se ve adónde va: una copia (`Flyer`, `.polish__fly`) vuela a la pestaña Tablón si se conserva o a la pestaña Inbox de la Isla si se olvida, que da un bote al recibirla (`LANDING`, WAAPI), y las demás cierran el hueco. La olvidada sale del proyecto cuando aterriza, así el contador del Inbox sube justo entonces; deshacer mientras vuela no llega al servidor.
- Lo decidido se guarda en el servidor, por persona (tabla `polish_vote`, `lib/polish-votes.ts`): al volver solo se pregunta por lo nuevo, en cualquier navegador. Con todo decidido (`.polish__done`) el tablón que se ha quedado gira solo, lejos y desenfocado entero, y encima cae en su sitio lo hecho, escalonado: hasta cinco de las referencias que se quedan ordenándose en abanico (`.polish__fan`), "Todo está en orden", el aviso de que se podrá volver a pulir cuando entren más referencias, "Ir al sistema" (que marca el proyecto como empezado) y "Repasarlo otra vez".
- **En un espacio de equipo es una votación** (más de un miembro; a solas todo lo de arriba sigue igual y cada respuesta se aplica al momento). → [decisión](decisiones/2026-10-06-en-equipo-el-pulido-es-una-votacion-que-se-cierra.md)
  - Olvidar y Conservar son el voto de cada persona ("Tu voto: que salga", "Tu voto: que se quede"): nada sale del tablón al votar y la tarjeta vuela a la pestaña Pulido. Bajo las dos mitades, en su mismo cristal, una línea lo dice siempre (`.polish__team`): "Aquí vota todo el equipo: sale lo que todos olvidan."
  - Cada persona solo ve pendiente lo que ella no ha votado. Lo que votaron los demás no se enseña hasta haber votado uno mismo: sale en la pasada de dudas, en el pie (`.polish__votes`: caras de quien conserva y de quien olvida).
  - Con el tablón votado, la pantalla final dice "Has votado todo", lo que suman los votos ("4 se quedan, 1 sale y 1 está en duda") y quién falta por votar. Una duda es una referencia en la que los votos no coinciden (`outcomeOf`, `lib/polish-tally.ts`).
  - "Resolver N dudas" (o "Ver N dudas" para quien no gestiona) repasa solo las dudas en el mismo tornado. Quien gestiona el espacio decide cada una ("Decides que salga"); los demás pueden cambiar su voto. "Volver" sale de la pasada.
  - "Cerrar pulido" solo lo tiene quien gestiona el espacio (`closeProjectPolish`): sale al Inbox lo que todos los que votaron olvidaron y las dudas decididas así; las dudas sin decidir se quedan en el tablón, abiertas. No espera a que vote todo el equipo. Cerrado, la pantalla vuelve a "Todo está en orden" con quién lo cerró y cuándo.
  - En la pestaña Pulido de la barra, las caras del equipo (`.topbar__faces`): a color quien ha votado todo el tablón, apagadas las demás. Se ven en Pulido y, desde cualquier vista, mientras haya votos sin cerrar.
- Zoom: la pastilla del tablón (`ZoomPill`, aquí con `.polish__corner`) en su misma esquina. Cambia el tamaño del em del tornado (`--polish-zoom`), del 50 % al 150 %: los botones paran en `ZOOM_STOPS`, el pellizco o ⌘/Ctrl+rueda es continuo y el % vuelve a 100. Se recuerda en el navegador. Con todo decidido, y en móvil, no hay zoom. → [decisión](decisiones/2026-10-06-zoom-y-musica-comparten-la-pastilla-de-la-esquina.md)
- La pastilla lleva también la música (`SoundControl`, ver Pastilla de la esquina), la misma que suena en el resto de la app.
- Solo la tarjeta de delante está enfocada y a plena luz: las demás llevan un desenfoque marcado (`NEAR_BLUR`) y un velo fuerte del color de la página (`SIDE_FOG`), y los dos crecen hacia el fondo (`BACK_BLUR`, `BACK_FOG`) hasta que las de atrás casi no se ven (Eric, 06-10: "digo que se vean menos").
- La profundidad es una niebla del color de la página (`.polish__fog`) más un desenfoque que crece hacia el fondo, no un oscurecido: funciona igual en claro y en oscuro. Con reduced-motion no hay deslizamientos y las tarjetas solo se funden.

### Inicio: ¿qué vas a hacer?
`ProjectChooser` · `Cover` · `components/ProjectChooser.tsx` · `.chooser` · captura: inicio
Caja para nombrar un proyecto nuevo (Enter crea) y la cuadrícula de proyectos, cada uno con su portada (mini masonry de su tablero) y su anillo. El placeholder rota ejemplos palabra a palabra y respeta reduced-motion.

### Inbox vacío
`InboxZero` · `components/InboxZero.tsx`
Trabajo hecho: un mensaje, los proyectos como portadas (los más llenos primero) y la misma caja para pegar URL o imagen.

### Proyecto vacío
`ProjectStart` · `components/ProjectStart.tsx`
Caja para pegar enlace o imagen, la frase de intención editable y la biblioteca para traer referencias en bloque.

### Primer arranque
`EmptyStart` · `components/EmptyStart.tsx`
Caja de prompt para pegar una URL y, debajo, un directorio de 9 sitios en pestañas, cada uno con "Añadir".

### Descubrir: ejemplos, recursos y skills
`Discover` · `TemplatesView` · `DiscoverSkills` · `components/Discover.tsx` · `.disc` · `.tplc` · `.disc-skill`
Tres pestañas: Ejemplos (`?in=templates`, antes Plantillas), Recursos (`?in=discover`) y Skills (`?in=skills`). Las tres comparten cabecera, en la columna del contenido y con el patrón de la página de proyecto: el nombre "Descubrir" y la entradilla de la sección (`.disc-head`) y, debajo, una fila (`.disc-bar`) con las pestañas a la izquierda y los controles de la sección a la derecha; la cabecera entera se va con la página al hacer scroll. → [decisión](decisiones/2026-10-06-la-cabecera-de-descubrir-va-en-la-columna-del-contenido.md) Recursos agrupados (Todo, Nuevos, Más abiertos), cada fila con una miniatura del hero de la web que sigue al ratón (`.disc-peek`, seguimiento con requestAnimationFrame y entrada con WAAPI; solo ratón, con reduced-motion solo fundido), y ejemplos: sistemas completos cuya miniatura hace scroll al pasar el ratón; abrir uno enseña su criterio.md y deja crear un proyecto con él. → [se llaman ejemplos](decisiones/2026-10-06-plantillas-se-llaman-ejemplos.md) Las tarjetas de ejemplo enseñan Clonar y Ver al pasar el ratón, con los botones del tablón (`.tile__go-btn`). → [decisión](decisiones/2026-10-06-tarjetas-de-ejemplo-con-clonar-y-ver-al-pasar.md)
- Skills (`components/DiscoverSkills.tsx`) son tarjetas, no filas, y todas son skills de agentes: avatar y autor, nombre, qué hace y el comando `npx skills add …` en un botón que lo copia; toda la tarjeta abre su página. Agrupadas por tema (`SKILL_TOPICS` en `lib/directory.ts`, con el encabezado `.disc-list__head` de los recursos), con las pestañas Todo, Recién llegados y Destacados (`FEATURED_SKILLS`) y el menú "Temas" a la derecha de la barra, como en Recursos, y, dentro de cada tema, primero las 13 de criterio.design (`MD_SKILLS` en `lib/md-skill-ids.ts`, nombre y descripción de `t.system.skillsList`, instaladas desde el repo público `criterio-skills` que escribe `scripts/build-skills.ts`) y después las de otros autores (`SKILLS` en `lib/directory.ts`); de estas, las que también están en criterio.md llevan la pastilla "En criterio.md" (`.disc-row__skill`). → [skills en Descubrir](decisiones/2026-10-05-skills-pestana-propia.md), [todas de agentes](decisiones/2026-10-06-todas-las-skills-son-de-agentes.md), [por temas](decisiones/2026-10-06-las-skills-de-descubrir-van-por-temas.md)

### Vídeo en bucle
`LoopVideo` · `components/LoopVideo.tsx`
Grabación corta, muda y en bucle que solo se reproduce mientras está a la vista.

## Sistema y marca

### Vista Sistema
`SystemView` · `components/SystemView.tsx` · `.spage`
La página del proyecto. Cabecera en dos líneas: el nombre arriba y, debajo, una sola fila (`.spage-bar`) con las pestañas a la izquierda y las acciones a la derecha, del ancho de la columna del fichero. Tres pestañas: **Markdown** (criterio.md tal cual, la que abre por defecto), **Documento** (el mismo fichero maquetado para leer) y **Presentación** (la marca como guía visual, `BrandPresentation`). → [vuelve la Presentación](decisiones/2026-10-06-vuelve-la-presentacion.md) A la derecha, "Mejorar con IA" como única acción primaria y un menú "…" con traer una marca que ya existe y compartir. Se recuerda en el navegador si se estaba en el fichero o en Resultados; el fichero siempre abre como Markdown. → [cabecera en dos líneas](decisiones/2026-10-06-cabecera-del-proyecto-en-dos-lineas.md) → [resultados en vez de presentación](decisiones/2026-10-05-resultados-en-vez-de-presentacion.md)

### Presentación de marca
`BrandPresentation` · `components/brand/BrandPresentation.tsx` · `components/brand/brand.css`
**Fuera de la vista Sistema desde el 05-10** (sigue en el enlace compartido). La marca como manual: índice a la izquierda y una sección por pantalla, cada una con su número, título grande en la tipografía display de la propia marca y una entradilla. Secciones: introducción, logo, color, tipografía, imagen, movimiento, voz, aplicaciones y recursos (`components/brand/sections/`).
- En la app cada valor se edita donde está; en un enlace compartido es de solo lectura y las secciones vacías no salen.
- Lo que el equipo edita a mano se queda fijo en las pasadas siguientes del modelo hasta que se devuelve.

### Texto editable de marca
`Editable` · `components/brand/edit/Editable.tsx`
Texto que se escribe donde está, con el tamaño y la fuente con que se muestra: un titular se edita como titular. Enter guarda una línea, Esc devuelve lo que había, salir guarda.

### Hueco de fichero
`FileSlot` · `components/brand/edit/FileSlot.tsx`
Donde va un fichero (logo, fuente, imagen): se suelta o se elige; enseña el fichero y deja cambiarlo o quitarlo.

### Maquetas de aplicación
`Mockups` · `components/brand/mockups/Mockups.tsx` · `.mk`
La marca aplicada en los sitios donde vivirá, dibujada en vivo con sus propios valores: cambias un color o el símbolo y todas las maquetas lo siguen. Cada maqueta cabe entera en su casilla; el cromo de las plataformas son formas planas y el texto solo va sobre una foto con velo o sobre el color de la marca.

### Importar una marca
`BrandImport` · `components/brand/BrandImport.tsx`
Traer una marca que ya existe de tres formas: su web (se mide y se lee), sus ficheros (logos, fuentes, fotos, un PDF de guía) o el texto de sus guías. Lo que entra es un punto de partida; los ficheros se reparten por su nombre ("mark", "white"…).

### Compartir la marca
`ShareDialog` · `SharePage` · `components/brand/` · `app/s/[token]/`
Un enlace de solo lectura con la presentación y el criterio.md para copiar o descargar, más un zip con logos, iconos y tokens. Cada enlace lleva el fichero completo o uno limpio, sin nombres ni comentarios del equipo, para gente de fuera. Sin sesión: el token es la prueba; no se indexa y no manda referer.

### Conectores
`Connectors` · `components/Connectors.tsx` · `.connectors__menu`
Un botón en la barra superior (icono `Plug`) con las dos formas de entrar desde fuera, de la cuenta y no del proyecto: la extensión de Chrome (instalarla o conectarla) y Conectar MCP (icono `Cable`). Cada fila con su tic cuando está conectada. El botón se queda siempre, también con las dos conectadas: es el único sitio donde ver las apps que tienen acceso y desconectar una. Sustituye al aviso "Instalar extensión". → [decisión](decisiones/2026-10-06-conectores-se-queda-siempre-en-la-barra.md)

### Conectar tu IA
`ConnectDialog` · `components/ConnectDialog.tsx` · `components/ConnectDialog.css` · `.mcpc`
Se abre desde la fila "Conectar MCP" del menú Conectores. Primero "Qué hace por ti": los cuatro usos (diseñar desde el criterio, traer lo que ya tienes, guardar lo de una conversación, revisar contra el criterio) y la regla de que nunca reescribe el fichero (Eric, 06-10: "igual hay que explicar qué podrá hacer por ti"). Luego la dirección del conector MCP (`/mcp`) con Copiar, un control segmentado con los pasos para Claude, ChatGPT, Claude Code (el comando) y Cursor (el JSON), y las aplicaciones conectadas con Desconectar. Nada más se teclea aquí: el cliente entra por OAuth. Recuerda el cliente elegido en el navegador. → [conector MCP](decisiones/2026-10-06-conector-mcp-lee-el-md-y-escribe-piezas.md)

### Permiso a una aplicación
`AuthorizePanel` · `app/mcp/authorize/` · `.auth--solo`
La página a la que un cliente de IA manda a la persona para entrar: con el mismo diseño que aceptar una invitación (logo, una frase grande con qué app pide, qué podrá hacer, a qué espacios llega, Permitir en primario y Cancelar), y "Entras como". Sin sesión, pasa por /login y vuelve con la misma petición. No se puede mostrar dentro de un frame de otra web.

### Documento criterio.md
`SystemDoc` · `components/SystemDoc.tsx` · `.sdoc` · captura: documento
La vista Markdown: el fichero con índice lateral y un punto de estado por área (respaldada, abierta, del equipo), las propuestas y las skills. Las propuestas se aceptan, rechazan o retiran bajo su área.

### Visor y editor Markdown
`SystemMarkdown` · `components/SystemMarkdown.tsx` · `components/SystemMarkdown.css` · `.mdv`
El fichero en un panel de código con el resaltado de un editor, o con aspecto de documento. El panel sigue el tema: oscuro en oscuro, hoja blanca en claro, con sus colores en variables `--md-*`. → [decisión](decisiones/2026-10-06-el-markdown-sigue-el-tema.md) Cada bloque se edita en el sitio (guarda al dejar de teclear o con ⌘Enter).
- Aspecto Documento: cada referencia citada es una fila con su captura (144×90) a la izquierda y, en una columna, su nombre, lo que se toma y lo que se dijo. → [decisión](decisiones/2026-10-06-referencias-del-documento-como-cita-con-captura.md)
- Aspecto Documento: una tabla de Markdown se pinta como tabla (`.mdv-tr`, `.mdv-td`), con líneas entre filas y sin caja. → [decisión](decisiones/2026-10-06-tablas-del-documento-como-tabla.md)
- Tecla C: modo comentar con pines en el punto exacto; Enter envía el pin.
- Proponer: al activarlo el cursor queda en la primera línea editable a la vista, sin mover el scroll; lo escrito en un área queda como propuesta al salir. No convive con Comentar.
- Barra: Proponer, Comentar, Skills y Copiar. Copiar es un botón partido (`.mdv-split`): la mitad de la flecha abre el menú del fichero. Los botones de la barra no llevan contorno. → [decisión](decisiones/2026-10-06-barra-del-fichero-en-cuatro-piezas.md)

### Menú de skills
`SkillsMenu` · `components/SkillsMenu.tsx` · `.sys-skills`
Interruptores (`role=switch`); cada skill añade una sección al criterio.md.

### Menú del fichero
`FileMenu` · `components/FileMenu.tsx`
La flecha junto a Copiar: "Descargar .md" y "Abrir en un chat" (Claude, ChatGPT, Gemini). Abrir va en dos pasos: el primer clic copia el mensaje con el fichero, el segundo abre el chat.

### Mejorar con IA
`ImproveModal` · `components/ImproveModal.tsx` · `.imp`
Antes de la pasada del modelo se elige el objetivo (ordenar, afinar la escritura, releer referencias), las áreas y un texto libre. Pregunta antes de gastar.

### Miniatura de referencia
`Thumb` · `components/Thumb.tsx`
Una referencia en pequeño: su imagen (guardada, póster del vídeo, la de la tarjeta, og:image) o su inicial si no carga. Una grabación de pantalla hace bucle sobre su fotograma.

## Ficha de referencia

### Ficha de referencia
`ItemPanel` · `components/ItemPanel.tsx` · `.ip` · captura: ficha
Hoja sobre el lienzo: favicon, nombre, migas, pestañas Página / Criterio y cerrar; la página a la izquierda y la conversación a la derecha. Las flechas ← → (y los botones a los lados) recorren el tablero en su orden; abierta desde Pulido es esa referencia sola, sin flechas.
- Si un pulido cerrado la sacó de un proyecto, lo dice encima de la conversación (`.cm-notice`, prop `notice` de `CommentsPanel`): "Olvidada en el pulido de Landing Savvia: Eric y Andoni", con "Devolver al tablón", que la devuelve y borra sus votos allí para que se vuelva a votar (`restoreToBoard`). Quitarla del tablón a mano no deja aviso.
- Crece desde el punto del clic (WAAPI, `--ease-out`); al cerrar, 0.96 con fundido de 150 ms. Con reduced-motion, solo fundido. Esc cierra.
- z 30 en escritorio, 60 en móvil.

### Vista de página
`PageView` · `components/PageView.tsx` · `.pn`
La captura completa para leer con scroll, o la imagen centrada. Brillo mientras carga.

### Vista de post de X
`PostView` · `components/PostView.tsx` · `.pv`
Autor, texto, fotos, vídeo o gif. El vídeo va en un iframe sin Referer (X devuelve 403 si lo lleva).

### Página de texto
`TextPage` · `components/TextPage.tsx` · `.ip-text`
La referencia de texto entera, editable en el sitio con autoguardado (también al cerrar).

### Reproductor de vídeo
`VideoPlayer` · `components/VideoPlayer.tsx` · `.vp`
Póster que solo carga el iframe del proveedor al pulsarlo.

### Conversación
`CommentsPanel` · `components/CommentsPanel.tsx` · `.cm`
La nota original y los hilos, con respuestas a un nivel. Capturas pegadas con ⌘V, arrastradas o con el clip; lightbox con ← → y Esc. Enter envía, Shift+Enter salta línea.
- La variante `drawer` no se usa.

### Criterio de la referencia
`RefCriterio` · `components/RefCriterio.tsx` · `.rfc`
La entrada de la referencia dentro del criterio.md del proyecto, editable, y las áreas que la citan; cada encabezado lleva a ese punto del Sistema.

## Ajustes y admin

### Marco de sección
`SectionShell` · `components/SectionShell.tsx` · `.settings` · captura: seccion
El marco de Ajustes, Actividad y esta librería: sidebar con grupos e iconos, migas y contenido a 800 px (1040 con `wide`).

### Encabezado de sección
`SettingsHeading` · `components/SettingsHeading.tsx` · `.settings__heading`
Título `.display`, entradilla y un aparte opcional a la derecha (selector de periodo, fuente…).

### Paneles de ajustes
`AccountPanel` · `WorkspacePanel` · `MembersPanel` · `ExtensionPanel` · `UsageCard` · `app/settings/_components/`
Cuenta (nombre, foto, tema, idioma), espacio, miembros e invitaciones, claves de la extensión y gasto de IA. Filas `.setting-row` sobre `Card`. Espacio acaba en "Tus espacios": todos los de la persona en filas `.list__row`, con Salir o Eliminar en cada una. → [decisión](decisiones/2026-10-06-los-espacios-se-eligen-en-una-lista-para-salir-o-eliminar.md) En Miembros, el rol de cada persona es un selector (`.list__pick`) para quien gestiona el equipo. → [decisión](decisiones/2026-10-06-un-miembro-borra-lo-suyo-y-los-admins-el-resto.md)

### Panel de actividad
`AdminPanel` · `AreaThumb` · `app/admin/AdminPanel.tsx` · `.ad-kpi`
Cifras, gráficos de columnas en SVG, personas, feedback y accesos. `AreaThumb` dibuja mini interfaces de 40 × 28 por zona de la app.

## Públicas

### Portada de invitado
`GuestStart` · `components/GuestStart.tsx` · `.guest__bar`
Barra con logo y Entrar, y el primer arranque debajo. Pegar una URL lleva a login con la URL como destino. Aún dice "savvia.studio" en la barra.

### Acceso
`LoginForm` · `components/LoginForm.tsx` · `.auth` · captura: login
Enlace mágico, Google, Apple y X, recordando el último método. Al lado, el collage fijo de `public/showcase/`, curado a mano. La página mide lo que la ventana (`.auth:not(.auth--solo)`, `100dvh`): el pie (`.auth__foot`), con la aceptación de Términos y Privacidad cuando `legalShown()`, se lee sin scroll; si la ventana es más baja que el formulario, hace scroll el panel. → [decisión](decisiones/2026-10-06-el-login-mide-la-ventana-y-su-pie-se-ve-sin-scroll.md)

### Documento legal
`LegalDoc` · `components/LegalDoc.tsx` · `.legal`
Las páginas `/privacy` y `/terms`: públicas, con la cabecera de página (`.page__head`: logo, título `.display`, entradilla y fecha de actualización), secciones de texto llano desde `lib/i18n/{en,es}/legal.ts` y, al pie, los enlaces a los otros documentos legales (`.legal__links`), incluida la privacidad de la extensión. Los datos de la sociedad salen de `lib/legal.ts`; mientras falten es un borrador: 404 en producción y un aviso (`.legal__draft`) en desarrollo. → [decisión](decisiones/2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md)

### Invitación
`AcceptInvitation` · `SwitchAccount` · `app/invite/[id]/`
Aceptar la invitación a un equipo; si el correo no coincide, cierra sesión y vuelve al login con la invitación como destino.

### Extensión
`InstallGuide` · `ConnectPanel` · `app/extension/`
Pasos para instalar el zip en `chrome://extensions` y conectar la extensión a un espacio generando su clave.

### Error y 404
`Lost` · `components/Lost.tsx` · `Lost.css` · `.lost` · lo usan `app/not-found.tsx` y `app/error.tsx`
La cabeza del logotipo flota en el sitio del cero de un "404" grande y tenue (`digits`); en un error va sola y torcida. Debajo, título, una línea de por qué y las salidas como hijos.
- Un solo primario: volver a la librería en la 404, volver a intentarlo en el error (la librería pasa a `.btn` normal, sin borde).
- Las cifras son decoración (`aria-hidden`, texto al 12 %); el título sigue siendo el `h1`.
- Por encima de 96 px `Logo` usa `icon-512.png` para que la cabeza no se vea blanda.
- `LostTheme` pone el tema al montar: una 404 o un error lanzados desde una página se pintan enteros en el navegador y el script de tema del `<head>` no llega a ejecutarse.
- `app/global-error.tsx` (falla el layout raíz) sigue sin estilos a propósito.
