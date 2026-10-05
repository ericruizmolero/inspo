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
Diálogo de Base UI. Tamaños `sm` y `lg`; el título lleva `.display.modal__title`. Fondo `.modal-backdrop` en z 200.
- Lo usan: añadir referencia, Mejorar con IA, crear equipo, directorio, paleta.

### Confirmación
`useConfirm` · `components/useConfirm.tsx` · `AlertDialog`
`confirm()` con promesa: `const [confirm, dialog] = useConfirm()`. Solo para lo que destruye o saca algo.

### Popover
`Popover` · `components/ui/popover.tsx` · `.pp` · `.pp--menu`
Menú flotante de Base UI (posicionador en z 55). Las filas usan `.ws__item`. Es la base de los selectores de proyecto y área, del menú de skills, de "Abrir en IA" y de los menús "…".

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
- Skills (`components/DiscoverSkills.tsx`, datos en `SKILLS` de `lib/directory.ts`) son tarjetas, no filas: avatar y usuario de GitHub del autor, nombre, qué hace y el comando `npx skills add …` en un botón que lo copia. Las que también son skill de criterio.md llevan la pastilla "En criterio.md" (`.disc-row__skill`). → [skills en Descubrir](decisiones/2026-10-05-skills-pestana-propia.md)

### Vídeo en bucle
`LoopVideo` · `components/LoopVideo.tsx`
Grabación corta, muda y en bucle que solo se reproduce mientras está a la vista.

## Sistema y marca

### Vista Sistema
`SystemView` · `components/SystemView.tsx` · `.spage`
La página del proyecto con dos vistas: **Presentación** (la marca como guía visual, la que abre por defecto) y **Markdown** (el criterio.md por bloques). Cabecera con "Mejorar con IA", "Rellenar la marca" y compartir. La vista elegida se recuerda en el navegador.

### Presentación de marca
`BrandPresentation` · `components/brand/BrandPresentation.tsx` · `components/brand/brand.css`
La marca como manual: índice a la izquierda y una sección por pantalla, cada una con su número, título grande en la tipografía display de la propia marca y una entradilla. Secciones: introducción, logo, color, tipografía, imagen, movimiento, voz, aplicaciones y recursos (`components/brand/sections/`).
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

### Documento criterio.md
`SystemDoc` · `components/SystemDoc.tsx` · `.sdoc` · captura: documento
La vista Markdown: el fichero con índice lateral y un punto de estado por área (respaldada, abierta, del equipo), las propuestas y las skills. Las propuestas se aceptan, rechazan o retiran bajo su área.

### Visor y editor Markdown
`SystemMarkdown` · `components/SystemMarkdown.tsx` · `components/SystemMarkdown.css` · `.mdv`
El fichero en un panel de código con el resaltado de un editor, o con aspecto de documento. Cada bloque se edita en el sitio (guarda al dejar de teclear o con ⌘Enter).
- Tecla C: modo comentar con pines en el punto exacto; Enter envía el pin.
- Barra: Skills, Abrir en IA, Copiar y Descargar.

### Menú de skills
`SkillsMenu` · `components/SkillsMenu.tsx` · `.sys-skills`
Interruptores (`role=switch`); cada skill añade una sección al criterio.md.

### Abrir en IA
`OpenInAI` · `components/OpenInAI.tsx`
Popover "Abrir en": el primer clic copia el mensaje con el fichero, el segundo abre el chat.

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
Título `.display`, entradilla y un aparte opcional a la derecha (selector de periodo, fuente…).

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
`app/error.tsx` · `app/not-found.tsx` · `.lost`
Logo, mensaje y un botón para volver.
