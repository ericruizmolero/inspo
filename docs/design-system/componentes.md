# Componentes

Cada pieza de la app con su nombre en castellano (el que usamos al hablar), su nombre técnico, su fichero y lo que hay que saber para usarla. Antes de crear algo, búscalo aquí; si creas una pieza reutilizable, añade su ficha.

## Sistema Criterio

Los componentes del sistema de diseño Criterio (`components/criterio/index.tsx`, `components/criterio/criterio.css`, clases `cr-*`), portados de su bundle y ampliados aquí. Antes de dibujar algo, búscalo en esta pestaña. La criatura solo es el logotipo: `Creature`, `Profile` y `Sprite` siguen fuera. → [decisión](decisiones/2026-10-07-sistema-de-diseno-criterio.md)

### Botón del sistema
`Button` · `.cr-btn` · `.btn` · muestra: botones
Grueso, con borde de tinta y bisel; al pulsar se hunde. `primary` (ember) es la acción de la vista y lo que ya era primario no se baja; `secondary` (papel) todo lo demás; `dark` (tinta) una segunda acción fuerte sobre papel; `quiet` sin borde ni relleno hasta el hover, para acciones dentro de barras; `danger` (rojo hondo) solo para confirmar algo que destruye.
- Tallas: s 34, m 44 (la normal en producto), l 52. En una misma barra, todos los botones en la misma talla.
- `icon` delante, `iconEnd` detrás ("Ya tengo mis referencias" lleva la flecha).

### Botón de icono del sistema
`IconButton` · `.cr-iconbtn` · muestra: boton-icono
Siempre redondo, un icono y su `label`, que es también el tooltip. quiet (dentro de barras), default (acciones sueltas), strong (la más importante de su fila). Tallas xs 24, s 32, m 40, l 48. En una tarjeta, s como mucho.

### Control segmentado
`SegmentedControl` · `.cr-seg` · muestra: segmentado
Vistas excluyentes, una activa. `chrome` en el cromo, `paper` en la página; `choice` lo vuelve un grupo de radio (tema, idioma, rol).

### Campos
`TextField` · `TextArea` · `PromptInput` · `.cr-input` · `.input` · muestra: campo
El pozo hundido (`--field`, `--sunken`): oscuro en Board, blanco en Paper. `TextArea` con `toolbar` es el compositor (comentar, responder, editar). `PromptInput` es la pregunta de Inicio, con `leading`, `below` y `busy`.

### Chip
`Chip` · `.cr-chip` · `.pill` · muestra: pastillas
Etiquetas con borde de tinta: paper, butter (sugerencias), ember (una regla activa), moss (bibliotecas), chrome. `pressed` se invierte a tinta con texto papel (con borde papel en Board); `onRemove` añade una x. Elegido no es ember.

### Casilla e interruptor
`Checkbox` · `Switch` · `.cr-check` · `.cr-switch`
La casilla hundida con el tic de tinta; el interruptor con pozo hundido, perilla con bisel y ember encendido.

### Tarjeta, globo y ventana
`Card` · `Balloon` · `TipWindow` · `DialogWindow` · `.cr-window` · `.modal--window`
Tarjetas planas. El globo de mantequilla para la voz de la app; la ventana (barra moss, cerrar strong xs, cuerpo, pie) para avisos largos, y `DialogWindow` para todo diálogo. Las confirmaciones (`useConfirm`) son ventanas con `danger` cuando destruyen. Siguen al tema: papel y tinta en Paper, panel oscuro con texto papel en Board.

### Menú
`.cr-menu` · `MenuItem` · `MenuLabel` · `Separator`
Cualquier popover con `cr-menu` es una ventana (papel en Paper, oscura en Board): filas de 32, títulos (`bar` = barra moss) y grupos separados por la línea grabada.

### Tooltip
`TipLayer` · `data-tip` · `.cr-tip`
Un globo de mantequilla pequeño para todo lo que lleve `data-tip`, pintado por una sola capa en `app/layout.tsx`. Nada de `title` nativo para tooltips.

### Lista, barra de estado, espera y tecla
`.cr-listbox` · `StatusBar` · `Busy` · `Key`
La lista en el pozo hundido (sugerencias, ⌘K, personas); celdas hundidas al pie (guardado, quién eres); cuatro celdas con una ember que avanza (todo `.spinner` se pinta así); una tecla con bisel para atajos.

### Estado y personas
`StatusRing` · `Progress` · `Avatar` · `AvatarStack` · `toneFor` · `Comment` · muestra: estado
Anillo moss al día, punto ember algo nuevo, anillo apagado sin empezar. Progreso en bloques ember. La misma persona, el mismo tono, en todas partes.

### Tablero y cromo
`BoardCard` · `ReferenceTile` · `NoteCard` · `EmptyState` · `ZoomControl` · `PillBar` · `Icon`
Las piezas del tablero y de las barras. `EmptyState` sin dibujo. `ZoomControl` con `inDisabled` y `outDisabled`.

## Comunes

### Botón
`Button` · `components/ui/button.tsx` · `.btn` · muestra: botones
Botón de Base UI cuyas variantes se traducen a las clases globales de `app/globals.css`, con el aspecto del `Button` del sistema Criterio: borde de tinta, bisel, se hunde al pulsar.
- Variantes: `primary` (`.btn--primary`, ember: la acción para la que existe la vista; una por vista), secundario (`default`, `.btn`, papel: todo lo demás, también Cancelar y Ahora no), `dark` (`.btn--dark`, tinta: en suelo papel cuando hace falta una segunda acción fuerte), `quiet` (`.btn--quiet`, `ghost` es su nombre viejo: sin borde, bisel ni relleno hasta el hover; acciones pequeñas dentro de barras y paneles, como "+ Añadir" en la barra de comandos, casi siempre con icono), `icon` (`.btn-icon`). En React también `Button` de `components/criterio` (`cr-btn`), con `icon` (delante) e `iconEnd` (detrás).
- Tamaños del sistema, sin excepciones locales de alto, relleno, letra o radio: l 52 (`.btn--lg`, héroes y marketing), m 44 (por defecto en producto: páginas, vistas, pies de diálogo), s 34 (`.btn--sm`, globos, ventanas, barras de herramientas, menús, la tarjeta del tablero). Solo dos excepciones: el botón partido junta sus esquinas, y el botón dentro de un campo (`.cr-textbox-bar`) lleva radio 6. `block` ocupa todo el ancho.
- Etiquetas en sentence case, verbo primero, cortas.
- Peligro: `.btn.is-danger` (texto) y `.is-danger-solid` (relleno).
- Desactivado: relleno `--disabled`, texto `--disabled-text`, borde `--disabled-border`, sin bisel.

### Botón de icono
`.btn-icon` · `app/globals.css` · muestra: boton-icono
32 px, transparente, icono en `--muted` que pasa a `--text` con fondo `--surface-2` al pasar el ratón. Siempre con `aria-label`.

### Campo de texto
`Input` · `components/ui/input.tsx` · `.input` · muestra: campo
40 px, radio `--radius-md`, hundido (`--sunken`) sobre `--field` con borde de tinta, como el `TextField` del sistema.

### Logotipo
`Logo` · `components/Logo.tsx` · `.logo` · muestra: logo
La criatura en 3D (verde, antenas naranjas, tres ojos), transparente: sustituye al nombre en la interfaz (el nombre va en el `alt`). Sin baldosa, radio ni sombra propios. `public/logo.png` hasta 96 px y `public/icon-512.png` por encima. El mismo dibujo es el favicon, el icono de Apple y el de la extensión. → [decisión](decisiones/2026-10-07-sistema-de-diseno-criterio.md)

### Ventana de ajustes y fila de campo
`SettingsWindow` · `FieldRow` · `components/criterio/index.tsx`
Cada sección de Ajustes y Actividad es una ventana: barra moss con el título (`h2`) y una cifra opcional a la derecha, descripción, cuerpo y pie (nota a la izquierda, acciones a la derecha; todos los pies igual de altos). Dentro, `FieldRow`: la etiqueta en una columna de 200 (con su pista debajo) y el control con su acción en la otra, todo a 44; el error va debajo del control. Las listas: filas de 52 como mínimo, avatar 32, solo líneas finas.

### Asistente de proyecto nuevo
`ProjectStart` · `components/ProjectStart.tsx`
Una ventana con el nombre del proyecto en la barra y dos pasos (Sobre qué es, Referencias): el campo de la descripción; luego pegar o subir y, debajo, la librería en un pozo hundido para elegir. El pie lleva el estado a la izquierda y Atrás/Añadir a la derecha.

### Ventana modal
`DialogWindow` · `components/ui/dialog.tsx` · `.modal--window`
Un modal con la forma de `TipWindow`: barra moss con título corto (`bar`) y cerrar en `IconButton` strong xs; `heading` en display 700; el cuerpo; `footer` opcional con una `Checkbox` y como mucho dos botones. Siempre papel y tinta, en los dos temas. Lo usa Conectar MCP.

### Isla
`Island` · `components/Island.tsx` · `.island` · captura: isla
Barra flotante de escritorio con los proyectos como pestañas, a lo Figma: Inicio (la casa), Descubrir, Inbox, "N más", "+" para proyecto nuevo y, a la izquierda, el avatar del espacio que abre el menú de espacio.
- Las pestañas abiertas se guardan por navegador y espacio; el ancho se mide con un `.island__measure` oculto.
- La pestaña activa lleva ⌄ (renombrar, borrar) y × (cerrar pestaña); el × ocupa el sitio del anillo de progreso.
- Renombrar en el sitio: Enter guarda, Esc cancela. Proyecto nuevo: ⌘/Ctrl+Enter.
- Se oculta a ≤800 px; en móvil navega la barra lateral. z 20 dentro de `.topbar`.

### Menú de espacio y avatares
`WorkspaceMenu` · `WorkspaceAvatar` · `UserAvatar` · `components/WorkspaceMenu.tsx` · `.ws`
Popover para cambiar de espacio (al instante dentro de la biblioteca), crear equipo y entrar en Ajustes, Actividad y Sistema de diseño (estos dos, solo socios).
- `WorkspaceAvatar` es cuadrado (logo o inicial); `UserAvatar` es redondo (foto o inicial).

### Paleta de comandos
`CommandPalette` · `components/CommandPalette.tsx` · `.cp` · captura: paleta
Diálogo cmdk con ⌘K / Ctrl+K: guardar la URL tecleada, añadir referencia, directorio, feedback, abrir referencias, cambiar de espacio, ajustes, actividad y sistema de diseño.
- Se carga en diferido y se monta tras el primer uso.

### Diálogo
`Dialog` · `components/ui/dialog.tsx` · `.modal`
Diálogo de Base UI. Tamaños `sm` y `lg`; el título es un `h2` con `.t-title-m` (toda ventana usa `DialogWindow`). Fondo `.modal-backdrop` en z 200.
- Lo usan: añadir referencia, Mejorar con IA, crear equipo, directorio, paleta.

### Confirmación
`useConfirm` · `components/useConfirm.tsx` · `AlertDialog`
`confirm()` con promesa: `const [confirm, dialog] = useConfirm()`. Solo para lo que destruye o saca algo.

### Popover
`Popover` · `components/ui/popover.tsx` · `.pp` · `.pp--menu`
Menú flotante de Base UI (posicionador en z 55). Las filas usan `.ws__item`. Es la base de los selectores de proyecto y área, del menú de skills, del menú del fichero y de los menús "…".

### Barra lateral
`AppSidebar` · `components/Sidebar.tsx` · `.app-sidebar` · `.nav-item`
Navegación sobre el sidebar de shadcn: añadir, Todo, Inbox, proyectos, directorio con 7 picks barajables, feedback y medidor del plan. **Solo se monta en móvil**; en escritorio navega la Isla. ⌘B / Ctrl+B la pliega.
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

### Selector de idioma
`LangSwitch` · `components/LangSwitch.tsx` · `.select`
Cada idioma escrito en su propio nombre. Guarda cookie y cuenta, y vuelve a pintar en el servidor.

### Herramienta de feedback
`FeedbackTool` · `FeedbackEntry` · `components/FeedbackTool.tsx` · `.fb-dock`
Capa sobre Agentation: píldora "Dar feedback", panel de 3 pasos y "Enviar al equipo". El dock se arrastra y recuerda su sitio. z 100000, siempre encima. `FeedbackEntry` es su entrada al pie de las barras laterales.

### Esqueleto
`.sk` · `app/globals.css` · muestra: skeleton
Brillo que recorre una superficie mientras carga (`shimmer`, 1.6 s). Lo que espera ocupa ya su forma final.

### Pastilla y control segmentado
`.ds-pill` · `.ds-seg` · `components/design-library/DesignLibrary.css` · muestra: pastillas
Etiqueta de estado sin borde (relleno al 16 % del color de estado) y grupo de opciones con la elegida en relleno. Hoy viven en esta librería; candidatas a subir a `globals.css` si se usan fuera.

## Biblioteca y tablero

### Biblioteca
`InspoClient` · `components/InspoClient.tsx` · `.shell` · `.topbar` · `.dock`
La app: barra superior (Isla, logo, acciones), selector Sistema/Tablero, el "+" y, abajo, el dock con la barra de reunir, la respuesta del agente y el buscador. Según el espacio activo enruta a Descubrir, Inicio, Inbox, tablero o Sistema.
- Atajos: ⌘K paleta, N añadir, "/" buscador (o sobre una tarjeta, entregarla al agente).

### Respuesta del agente
`AgentCard` · `components/InspoClient.tsx` · `.dock__agent`
Lo que el agente hizo, con deshacer; sus preguntas con opciones; y lo destructivo pendiente con Hazlo / Déjalo.

### Tablero
`Grid` · `components/Grid.tsx` · `.board` · captura: tablero
Masonry con scroll vertical. El layout son números (ratio de cada tarjeta) y solo se montan las tarjetas cercanas a la pantalla.
- Zoom por columnas: `.board-zoom` (− % +), pellizco o ⌘/Ctrl+rueda. Abre un paso más lejos que el 100 %.
- Las tarjetas se deslizan a su nuevo sitio con una transición CSS de `transform`.
- Cada tarjeta pide la copia de captura que necesita: 288, 720 o 1440 px.

### Tarjeta de referencia
`InspoCard` · `components/InspoCard.tsx` · `.tile` · captura: tarjeta
La miniatura en su forma real: web (og:image, captura o póster tipográfico), imagen, vídeo en bucle o texto.
- Nota con avatares, chips de etiquetas y estado "reuniendo".
- Abajo: Archivar en proyecto, Al sistema y Comentarios. Al pasar el ratón, la página hace scroll dentro de la tarjeta.
- Borrar en dos pasos: Esc o 6 s lo cancelan.

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
- Muestra la tarjeta marcada con "/" como objetivo.
- Esc en cascada: cierra la lista, vacía, quita chips, quita objetivo, suelta el foco.

### Barra de reunir referencias
`GatherBar` · `components/GatherBar.tsx` · `.gather`
Pegada al dock: recuento, tres miniaturas apiladas, "Añadir" y "Ya tengo mis referencias", que marca el proyecto como empezado y lleva al Sistema.

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

### Descubrir: plantillas, recursos y skills
`Discover` · `TemplatesView` · `DiscoverSkills` · `components/Discover.tsx` · `.disc` · `.tplc` · `.disc-skill`
Tres pestañas: Plantillas (`?in=templates`), Recursos (`?in=discover`) y Skills (`?in=skills`). Recursos agrupados (Todo, Nuevos, Más abiertos), cada fila con una miniatura del hero de la web que sigue al ratón (`.disc-peek`, seguimiento con requestAnimationFrame y entrada con WAAPI; solo ratón, con reduced-motion solo fundido), y plantillas: sistemas completos cuya miniatura hace scroll al pasar el ratón; abrir una enseña su criterio.md y deja crear un proyecto con ella.
- Skills (`components/DiscoverSkills.tsx`) son tarjetas, no filas, y todas son skills de agentes: avatar y autor, nombre, qué hace y el comando `npx skills add …` en un botón que lo copia; toda la tarjeta abre su página. Una sola lista: primero las 13 de criterio.design (`MD_SKILLS` en `lib/md-skill-ids.ts`, nombre y descripción de `t.system.skillsList`, instaladas desde el repo público `criterio-skills` que escribe `scripts/build-skills.ts`) y después las de otros autores (`SKILLS` en `lib/directory.ts`); de estas, las que también están en criterio.md llevan la pastilla "En criterio.md" (`.disc-row__skill`). → [skills en Descubrir](decisiones/2026-10-05-skills-pestana-propia.md), [todas de agentes](decisiones/2026-10-06-todas-las-skills-son-de-agentes.md)

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
Un botón en la barra superior (icono `Plug`) con las dos formas de entrar desde fuera, de la cuenta y no del proyecto: la extensión de Chrome (instalarla o conectarla) y Conectar MCP (icono `Cable`). Cada fila con su tic cuando está conectada; con las dos conectadas el botón se va. Sustituye al aviso "Instalar extensión". → [decisión](decisiones/2026-10-06-conectores-en-un-menu-de-la-barra.md)

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
El fichero en un panel de código con el resaltado de un editor, o con aspecto de documento. Cada bloque se edita en el sitio (guarda al dejar de teclear o con ⌘Enter).
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
Hoja sobre el lienzo: favicon, nombre, migas, pestañas Página / Criterio y cerrar; la página a la izquierda y la conversación a la derecha. Las flechas ← → (y los botones a los lados) recorren el tablero en su orden.
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
Un `h1` (sin clase: el elemento ya da el tamaño), entradilla en `.t-body` y un aparte opcional a la derecha (selector de periodo, fuente…).

### Paneles de ajustes
`AccountPanel` · `WorkspacePanel` · `MembersPanel` · `ExtensionPanel` · `UsageCard` · `app/settings/_components/`
Cuenta (nombre, foto, tema, idioma), espacio, miembros e invitaciones, claves de la extensión y gasto de IA. Filas `.setting-row` sobre `Card`.

### Panel de actividad
`AdminPanel` · `AreaThumb` · `app/admin/AdminPanel.tsx` · `.ad-kpi`
Cifras, gráficos de columnas en SVG, personas, feedback y accesos. `AreaThumb` dibuja mini interfaces de 40 × 28 por zona de la app.

## Públicas

### Portada de invitado
`GuestStart` · `components/GuestStart.tsx` · `.guest__bar`
Barra con logo y Entrar, y el primer arranque debajo. Pegar una URL lleva a login con la URL como destino. Aún dice "savvia.studio" en la barra.

### Acceso
`LoginForm` · `components/LoginForm.tsx` · `.auth` · captura: login
Enlace mágico, Google, Apple y X, recordando el último método. Al lado, el collage fijo de `public/showcase/`, curado a mano.

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
