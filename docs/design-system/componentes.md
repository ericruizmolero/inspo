# Componentes

Cada pieza de la app con su nombre en castellano (el que usamos al hablar), su nombre técnico, su fichero y lo que hay que saber para usarla. Antes de crear algo, búscalo aquí; si creas una pieza reutilizable, añade su ficha. Cada ficha del sistema lleva una muestra viva pintada con el CSS real de la app; no hay capturas. → [muestras vivas](decisiones/2026-10-07-la-libreria-pinta-muestras-vivas-sin-capturas.md)

## Sistema Criterio

Los componentes del sistema de diseño Criterio (`components/criterio/index.tsx`, `components/criterio/criterio.css`, clases `cr-*`), portados de su bundle y ampliados aquí: una ficha por export. Antes de dibujar algo, búscalo en esta pestaña; lo que la app tenía antes con la misma función (`.btn`, `.input`, `.pill`, `components/ui/button.tsx`) es la misma pieza con el nombre viejo y está en la ficha de la nueva. La criatura solo es el logotipo: `Creature`, `Profile` y `Sprite` siguen fuera. → [decisión](decisiones/2026-10-07-sistema-de-diseno-criterio.md)

### Botón
`Button` · `components/criterio/index.tsx` · `.cr-btn` · `components/ui/button.tsx` · `.btn` · muestra: botones
Grueso, con borde de tinta y bisel; al pulsar se hunde (`--bevel-pressed` y 1 px abajo). `primary` (ember) es la acción para la que existe la vista, una por vista, y lo que ya era primario no se baja; `secondary` (papel, la variante por defecto) todo lo demás, también Cancelar y Ahora no; `dark` (tinta) una segunda acción fuerte sobre papel; `quiet` sin borde, bisel ni relleno hasta el hover, para acciones pequeñas dentro de barras y paneles, casi siempre con icono; `danger` (`--danger-deep`) solo para confirmar algo que destruye. → [lo que era primario](decisiones/2026-10-07-lo-que-era-primario-sigue-siendo-primario.md)
- Tallas: s 34 (globos, ventanas, barras de herramientas, menús, la tarjeta del tablero), m 44 (la normal en producto: páginas, vistas, pies de diálogo), l 52 (héroes). En una misma barra, todos en la misma talla. Sin excepciones locales de alto, relleno, letra o radio; solo dos: el botón partido junta sus esquinas y el botón dentro de un campo (`.cr-textbox-bar`) lleva radio 6.
- `icon` delante, `iconEnd` detrás ("Ya tengo mis referencias" lleva la flecha); `pressed` lo deja hundido; `href` lo vuelve un enlace.
- `Button` de `components/ui/button.tsx` (Base UI) es la misma pieza con las clases globales `.btn`, `.btn--primary`, `.btn--dark`, `.btn--quiet` (`ghost` es su nombre viejo), `.btn--danger`, `.btn--sm`, `.btn--lg` y `block`: lo usan los componentes anteriores al sistema. Lo nuevo va en el `Button` del sistema.
- Etiquetas en sentence case, verbo primero, cortas. Desactivado: relleno `--disabled`, texto `--disabled-text`, borde `--disabled-border`, sin bisel.

### Botón de icono
`IconButton` · `.cr-iconbtn` · muestra: boton-icono
El único botón de solo icono de la app: siempre redondo, un icono y su `label`, que es también el tooltip (`data-tip`). Tres variantes: quiet (sin relleno hasta el hover, dentro de barras), default (relleno con línea fina, acciones sueltas), strong (papel, borde de tinta y bisel, la más importante de su fila). Tallas xs 24, s 32, m 40, l 48, con iconos de 14, 16, 18 y 20. `active` marca el sitio actual; con `toggle` es un interruptor (el sonido) y `active` se anuncia como pulsado. → [decisión](decisiones/2026-10-07-un-solo-boton-de-icono-redondo.md)
- En una tarjeta del tablero, s como mucho. Sobre el cromo, el contenedor lleva `cr-on-chrome` y los botones leen los tokens del cromo.
- Los nombres viejos siguen funcionando (`ghost` = quiet, `chrome` y `round` = default, `raised` = strong). `.btn-icon` de `globals.css` y la variante `icon` de `ui/button.tsx` son la versión anterior, sin uso.

### Control segmentado
`SegmentedControl` · `SegmentItem` · `.cr-seg` · `components/ui/liquid.tsx` · muestra: segmentado
Vistas excluyentes, una activa. Cada opción es un `SegmentItem` (`label`, `icon`, `count`, `dot`, `title`). `tone` `chrome` sobre el cromo (el selector Tablón / Pulido / Sistema) y `paper` en la página; `choice` lo vuelve un grupo de radio (tema, idioma, rol) en vez de pestañas. Pasa por `Liquid`: el hover fluye de opción en opción y la elegida cambia en el mismo clic.
- El de papel es un pozo hundido con borde sutil (`--border`, 1 px) y la elegida como tecla con bisel. Dos tallas: m (44, junto a un `Button` m) y s (`size="s"`, 34, en una fila de herramientas dentro de la página, junto a botones s: Descubrir). → [decisión](decisiones/2026-10-07-el-segmentado-de-papel-tiene-talla-s-y-un-borde-sutil.md)

### Pregunta de inicio
`PromptInput` · `.cr-prompt` · muestra: prompt
La única pregunta de la casa: un campo grande y redondeado con el botón redondo de enviar, que se enciende cuando hay texto. `leading` pone algo delante (adjuntar), `below` una segunda línea dentro de la misma forma, `busy` cambia la flecha por la espera. `inputRef`, `onKeyDown`, `onPaste` e `inputProps` para lo que el campo necesite (pegar una URL, una imagen). También es la caja de Inbox vacío y de proyecto vacío.

### Campo de texto
`TextField` · `.cr-field` · `.cr-input` · `components/ui/input.tsx` · `.input` · muestra: campo
El pozo hundido (`--field`, `--sunken`, 44 de alto, radio `--radius-md`): casi negro con texto papel en Board, blanco con tinta y línea suave en Paper. `label` arriba en pequeño y apagado; `hint` debajo, y con `.cr-field-hint.is-error` el error va bajo el campo. Un campo de solo lectura o desactivado se ve plano y apagado. → [campos en Board](decisiones/2026-10-07-los-campos-tienen-version-oscura.md)
- `Input` de `components/ui/input.tsx` (`.input`, `.input--lg`) es el mismo pozo con el nombre viejo; quedan dos usos.

### Área de texto y compositor
`TextArea` · `.cr-textarea` · `.cr-textbox` · muestra: compositor
El gemelo de varias líneas del campo. Con `toolbar` se vuelve el compositor (comentar, responder, editar): el textarea, lo que se pase como hijos (adjuntos esperando) y una barra de herramientas (`.cr-textbox-bar`, herramientas `.cr-textbox-tool`) dentro de un solo campo, y el foco rodea el campo entero.

### Casilla
`Checkbox` · `.cr-check` · muestra: casilla
La casilla hundida con el tic de tinta y su etiqueta al lado. Controlada (`checked`, `onChange`) o con `defaultChecked`.

### Interruptor
`Switch` · `.cr-switch` · muestra: interruptor
Encendido y apagado: pista hundida (copia el pozo de la casilla), perilla de papel con bisel (copia el botón) y ember encendido. Siempre con `label`; `role=switch`. → [las piezas pequeñas](decisiones/2026-10-07-las-piezas-pequenas-copian-a-las-grandes.md) Dentro de un `FieldRow` guarda su tamaño (34 por 20), no se estira como un campo.

### Chip
`Chip` · `.cr-chip` · `.pill` · muestra: pastillas
Etiquetas con borde de tinta: paper (por defecto), butter (sugerencias), ember (una regla activa), moss (bibliotecas), chrome (sobre el cromo y en las sugerencias de los vacíos). Con `onClick` es un botón; `pressed` lo invierte a tinta con texto papel (con borde papel en Board); `onRemove` añade una x (un filtro). Elegido no es ember. `.pill` es el nombre viejo; quedan dos usos.
- Dentro de Añadir (`.add__area`) la Chip se pinta como pastilla de 28, transparente, con los dos grises del formulario. → [decisión](decisiones/2026-10-07-anadir-es-el-modal-plano-con-el-formulario-empaquetado.md)

### Tarjeta
`Card` · `.cr-card` · muestra: tarjeta
Plana, sin sombra, con una línea fina. `raised` (por defecto) sigue al tema: `--board-card` en Board, `--paper-light` en Paper; `paper`, `moss`, `ink`, `ember` y `butter` son tonos sólidos para referencias de color y bloques destacados (un ember por vista). `eyebrow` y `title` opcionales; `as` elige el elemento (`section`, `article`, `li`). Es el suelo de los paneles de Ajustes, del catálogo de esta librería y de los vacíos.

### Globo
`Balloon` · `.cr-balloon` · muestra: globo
Un consejo corto con rabo (`tail` izquierda o derecha): mantequilla, borde de tinta, título y texto, `actions` al pie. Uno en pantalla como mucho. Sin dibujo de la criatura.

### Ventana de consejo
`TipWindow` · `.cr-window` · muestra: ventana
Para avisos largos, una vez por sesión como mucho: barra moss con el título corto (`title`) y cerrar con bisel (`onClose`, o `false` para no tenerlo), `heading` en display, cuerpo y `footer`. Sigue al tema: papel y tinta en Paper, panel oscuro con texto papel en Board. Es la forma del panel de feedback (`.fb-panel`), del aviso del acceso (`.auth-window`) y de los avisos (`.toast`). → [decisión](decisiones/2026-10-07-toda-ventana-lleva-barra-moss-y-sigue-al-tema.md)

### Ventana de diálogo
`DialogWindow` · `Dialog` · `DialogContent` · `components/ui/dialog.tsx` · `.modal--window` · `.modal` · muestra: dialogo
El diálogo de Base UI (`Dialog`, fondo `.modal-backdrop` en z 200) con dos cuerpos. `DialogWindow` es la ventana de consejo como modal: barra moss (`bar`) y cerrar en `IconButton` strong xs (`closeLabel`), `heading` en display 700, el cuerpo y `footer` con una casilla opcional y como mucho dos botones; para avisos, confirmaciones y pasos cortos (Conectar MCP a 680, el asistente de proyecto nuevo). `DialogContent` (`.modal`, tamaños `sm` y `lg`, `.modal__header` con título en `t-title-s` y cierre `IconButton` default s) es el modal plano con marco de tinta de 1,5 px: para un formulario largo (Añadir, Mejorar con IA, crear equipo, directorio, paleta). Los dos siguen al tema. → [ventanas](decisiones/2026-10-07-toda-ventana-lleva-barra-moss-y-sigue-al-tema.md), [Añadir en el modal plano](decisiones/2026-10-07-anadir-es-el-modal-plano-con-el-formulario-empaquetado.md)
- Las confirmaciones (`useConfirm`) son una `DialogWindow` con `Button` danger cuando destruyen.

### Ventana de ajustes
`SettingsWindow` · `.cr-swin` · muestra: ventana-ajustes
Cada sección de Ajustes y Actividad es una ventana a todo el ancho de la columna: barra moss con el título (`h2`) y una cifra opcional a la derecha (`figure`, texto tabular, nunca un chip), descripción, cuerpo y pie con una nota a la izquierda (`note`: un aviso, un éxito o un error de toda la sección) y las acciones a la derecha (`actions`); todos los pies igual de altos. Las listas dentro: filas de 52 como mínimo, avatar 32, solo líneas finas.

### Fila de campo
`FieldRow` · `.cr-fieldrow` · muestra: fila-campo
Un ajuste en una línea: la etiqueta en una columna de 200 (con su `hint` debajo) y el control con su `action` en la otra, todo a 44 y centrado; el `error` va debajo del control. Se apila por debajo de 560 px. `htmlFor` cuando el control es un campo (la etiqueta pasa a `label`); un grupo de radio o una imagen se nombran solos.

### Menú
`MenuItem` · `MenuLabel` · `.cr-menu` · muestra: menu
Cualquier popover con `cr-menu` es una ventana (papel en Paper, oscura en Board): filas de 32 y radio 6 (`MenuItem`, con `icon`, `checked` y `danger`), títulos discretos (`MenuLabel`, `.cr-menu-heading`) y grupos separados por la línea grabada. Dentro, los textos usan los tokens que el menú redefine (`--text`, `--text-2`, `--surface-2`), nunca `--ink` ni `--disabled`. → [dentro de un menú](decisiones/2026-10-07-dentro-de-un-menu-el-texto-usa-los-tokens-del-menu.md)
- Sin barra moss en los menús: el de espacios y el de nuevo proyecto de la Isla llevan su título como `cr-menu-heading`. `MenuLabel bar` (`.cr-menu-bar`) queda solo para esta librería. → [decisión](decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)
- Marco de 1 px y sombra, sin bisel: el bisel queda para ventanas y botones. → [decisión](decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)

### Separador
`Separator` · `.cr-sep` · muestra: separador
La línea grabada (copia la sombra y la luz del bisel) entre grupos de un menú, una ventana o una lista; `vertical` para una barra.

### Tooltip
`TipLayer` · `data-tip` · `.cr-tip` · muestra: tooltip
Un globo de mantequilla pequeño para todo lo que lleve `data-tip` (`IconButton` lo pone desde su `label`), pintado por una sola capa en `app/layout.tsx`: aparece a los 500 ms de hover o al momento con el foco de teclado, encima del elemento (debajo si no hay sitio), y se va al salir, al perder el foco, con scroll o con Esc. Nada de `title` nativo para tooltips. → [las piezas pequeñas](decisiones/2026-10-07-las-piezas-pequenas-copian-a-las-grandes.md)

### Lista
`.cr-listbox` · `.cr-listbox-item` · muestra: lista
La lista en el pozo hundido: opciones (`role=option`, `aria-selected`) para las sugerencias del buscador, la paleta ⌘K, la librería del proyecto nuevo y las personas. Solo CSS: cada sitio pinta sus filas.

### Barra de estado
`StatusBar` · `StatusCell` · `.cr-statusbar` · muestra: barra-estado
Una tira de celdas hundidas (copia el campo) al pie: guardado, cuentas, con quién has entrado. `grow` en la celda que ocupa el resto. `role=status`.

### Espera
`Busy` · `.cr-busy` · muestra: espera
Cuatro celdas hundidas con una ember que avanza (copia el progreso). Sustituye a todo spinner: `.spinner` se pinta así. Con `label` para el lector de pantalla.

### Tecla
`Key` · `.cr-key` · muestra: tecla
Una tecla con bisel para los atajos: ⌘K, /, Esc.
- Dentro de un campo (el "/" del buscador, `.search__kbd`), la tecla va plana: sin fondo ni bisel, glifo apagado y línea fina. → [decisión](decisiones/2026-10-07-la-barra-del-buscador-lleva-el-atajo-plano-sin-fondo.md)

### Anillo de estado
`StatusRing` · `.cr-ring` · muestra: anillo
El estado de un tablero: anillo moss al día (`synced`), punto ember algo nuevo (`new`), anillo apagado sin empezar (`idle`). Con `label` propio si el nombre por defecto no sirve.

### Progreso
`Progress` · `.cr-progress` · muestra: progreso
Progreso en bloques ember dentro de un pozo hundido (`segments`, 22 por defecto). Siempre junto a un texto que diga qué pasa; `label` para el lector de pantalla.

### Avatar
`Avatar` · `AvatarStack` · `toneFor` · `AvatarTone` · `.cr-avatar` · `.cr-avatars` · muestra: avatar
Iniciales (o la foto, `src`; si no carga, vuelven las iniciales) sobre un color de marca: moss, butter o ember, y `toneFor(nombre)` da siempre el mismo tono a la misma persona. Solo para personas; `chrome` y `square` para un espacio o una fuente. `AvatarStack` solapa varios. El `Avatar` y `hueFor` de `components/CommentsPanel.tsx` son la versión anterior, pendiente de unificar.

### Comentario
`Comment` · `.cr-comment` · muestra: comentario
Un comentario corto bajo una referencia: avatar de 20, autor en negrita y dos líneas como mucho.

### Tarjeta de tablero
`BoardCard` · `.cr-boardcard` · muestra: tarjeta-tablero
Un tablero en la casa: mosaico de sus primeras referencias (`tiles`, hasta 8), el nombre, la cuenta (`countLabel`) y su anillo de estado. Enlace con `href` o botón con `onClick`. Es la portada de proyecto de Inicio y de Inbox vacío.

### Baldosa de referencia
`ReferenceTile` · `.cr-ref` · muestra: referencia
Una referencia guardada en pequeño, con su propia altura: imagen, vídeo (con el triángulo y la barra de reproducido) o enlace. La usa el mosaico de la tarjeta de tablero.

### Nota
`NoteCard` · `.cr-note` · muestra: nota
Una referencia de texto: etiqueta del tipo, título en display y el cuerpo que se desvanece abajo.

### Vacío
`EmptyState` · `.cr-empty` · muestra: vacio
Lo que dice un sitio vacío: un título corto, una o dos frases y `suggestions` como chips de cromo que rellenan el paso siguiente (`onSuggest`). Sin dibujo (`art` queda libre). Lo usan los comentarios, la ficha, Pulido, Ajustes y Actividad.

### Control de zoom
`ZoomControl` · `.cr-zoom` · muestra: zoom
La pastilla del zoom: menos, el porcentaje en cifras tabulares (clic vuelve al 100) y más, con `IconButton` quiet s. `inDisabled` y `outDisabled` en los topes; `valueLabel` cuando el porcentaje dice poco (las columnas del tablero). La pastilla de la esquina (`ZoomPill`) la envuelve con la música.

### Barra de pastilla
`PillBar` · `PillBarSep` · `.cr-pillbar` · muestra: pillbar
Una pastilla de cromo que junta un control segmentado y acciones, separados por una línea fina: el selector de vista de la barra superior.

### Icono
`Icon` · `IconName` · `.cr-icon` · muestra: iconos
Los iconos de línea del sistema: cuadrícula de 24, trazo 2, puntas redondas, `currentColor`; `play` es el único relleno. Los nombres son `IconName` (home, plus, close, search, folder, trash, copy…). Cada icono conserva su trazo: nada de reglas globales de grosor. Para los conceptos nuestros, los iconos de área y de sección. → [decisión](decisiones/2026-10-07-cada-icono-conserva-su-trazo.md)

### Wordmark
`Wordmark` · `.cr-wordmark` · muestra: wordmark · sin uso
El nombre en display 800 y minúscula, tinta sobre papel o papel sobre moss. Sin la o con ojos. Hoy el logotipo es la criatura (`Logo`) y el nombre no se pinta en la interfaz.

### Sobre el cromo
`.cr-on-chrome` · muestra: cromo
Clase para un contenedor que va sobre el cromo (la Isla, el selector de vista, el zoom, el dock, la ficha y sus menús la llevan ya): sus botones de icono leen los tokens del cromo (`--chrome-text`, `--chrome-ink`, `--chrome-raised`) y el foco pasa a `--ember-glow` en Board y a `--focus` en Paper. El cromo sigue al tema y es sólido; el cristal es solo de las pastillas de la Isla y del selector. → [el cromo sigue al tema](decisiones/2026-10-07-el-cromo-sigue-al-tema.md), [cromo de arriba](decisiones/2026-10-07-el-cromo-de-arriba-vuelve-a-44-y-sus-pastillas-a-cristal.md)

## Comunes

Piezas compartidas de la app que no vienen del sistema: navegación, menús propios, iconos de la casa y utilidades. Lo que se parezca a una pieza del sistema se construye con ella.

### Logotipo
`Logo` · `components/Logo.tsx` · `.logo` · muestra: logo
La criatura en 3D (verde, antenas naranjas, tres ojos), transparente: sustituye al nombre en la interfaz (el nombre va en el `alt`). Sin baldosa, radio ni sombra propios. `public/logo.png` hasta 96 px y `public/icon-512.png` por encima. El mismo dibujo es el favicon, el icono de Apple y el de la extensión. → [decisión](decisiones/2026-10-07-la-criatura-es-el-logotipo-y-nada-mas.md)

### Asistente de proyecto nuevo
`ProjectStart` · `components/ProjectStart.tsx`
Una ventana con el nombre del proyecto en la barra y dos pasos (Sobre qué es, Referencias): el campo de la descripción; luego pegar o subir y, debajo, la librería en un pozo hundido para elegir. El pie lleva el estado a la izquierda y Atrás/Añadir a la derecha.

### Isla
`Island` · `components/Island.tsx` · `.island`
Barra flotante de escritorio con los proyectos como pestañas, a lo Figma: Inicio (la casa), Descubrir, Inbox, "N más", "+" para proyecto nuevo y, a la izquierda, el avatar del espacio que abre el menú de espacio.
- El tile de la izquierda (`.island__logo`, 26 px) es `WorkspaceFace` del espacio activo: su logo, o tu foto en el personal; nunca la mascota del producto. → [decisión](decisiones/2026-10-07-el-tile-de-la-isla-muestra-el-espacio-no-la-mascota.md)
- Las pestañas abiertas se guardan por navegador y espacio; el ancho se mide con un `.island__measure` oculto.
- El relleno de la pestaña activa y el del hover son las pastillas de `Liquid`, sin borde: la del hover fluye de una pestaña a otra y la activa aparece en el mismo clic. → [decisión](decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md)
- La pestaña activa lleva ⌄ (renombrar, borrar) y × (cerrar pestaña); el × ocupa el sitio del anillo de progreso.
- Renombrar en el sitio: Enter guarda, Esc cancela. Proyecto nuevo: ⌘/Ctrl+Enter.
- Mide 44 px: pestañas y botones de 34, letra `--fs-chrome` (14 px), relleno de 4. Hover y activa son pastillas de cristal (`--glass-*`). → [cromo de arriba](decisiones/2026-10-07-el-cromo-de-arriba-vuelve-a-44-y-sus-pastillas-a-cristal.md)
- Se oculta a ≤800 px; en móvil navega la barra lateral. z 20 dentro de `.topbar`.

### Menú de espacio y avatares
`WorkspaceMenu` · `WorkspaceAvatar` · `UserAvatar` · `components/WorkspaceMenu.tsx` · `.ws`
Popover para cambiar de espacio (al instante dentro de la biblioteca), crear equipo y entrar en Ajustes, Actividad y Sistema de diseño (estos dos, solo socios).
- Desde la Isla lleva además el equipo en una fila de caras solapadas (`.island__team`: cada cara filtra por quién guardó, las que no caben se cuentan en un "+N", "Gestionar" al final), el directorio, el feedback y el plan en una línea (`PlanMeter` con `compact`: "146/2.000 IA", las acciones de IA del mes, que se releen al abrir el menú). → [qué cuenta](decisiones/2026-10-06-el-plan-cuenta-acciones-de-ia.md) No lista proyectos: son las pestañas de la Isla.
- Cuelga siempre debajo de lo que lo abre y nunca mide más que el hueco de la ventana (`--available-height`); si no cabe, hace scroll por dentro. → [decisión](decisiones/2026-10-06-el-menu-de-espacio-no-lista-proyectos-y-el-equipo-son-caras.md)
- `WorkspaceAvatar` es cuadrado (logo o inicial); `UserAvatar` es redondo (foto o inicial).

### Paleta de comandos
`CommandPalette` · `components/CommandPalette.tsx` · `.cp`
Diálogo cmdk con ⌘K / Ctrl+K: guardar la URL tecleada, añadir referencia, directorio, feedback, abrir referencias, cambiar de espacio, ajustes, actividad y sistema de diseño.
- Se carga en diferido y se monta tras el primer uso.

### Confirmación
`useConfirm` · `components/useConfirm.tsx` · `AlertDialog`
`confirm()` con promesa: `const [confirm, dialog] = useConfirm()`. Una `DialogWindow` con `Button` danger cuando destruye. Solo para lo que destruye o saca algo. Con `typed`, la acción espera a que se escriba ese nombre: para lo que se lleva el trabajo de otras personas (eliminar un equipo). → [decisión](decisiones/2026-10-06-los-espacios-se-eligen-en-una-lista-para-salir-o-eliminar.md)

### Popover
`Popover` · `components/ui/popover.tsx` · `.pp` · `.pp--menu`
Menú flotante de Base UI (posicionador en z 55). Las filas usan `.ws__item`. Es la base de los selectores de proyecto y área, del menú de skills, del menú del fichero y de los menús "…".
- Lo que va dentro de un menú se pinta con los tokens que el menú redefine por tema (`--text`, `--text-2`, `--surface-2`), nunca con `--ink` ni `--disabled`: en Board el menú es oscuro y la tinta del papel desaparece. → [decisión](decisiones/2026-10-07-dentro-de-un-menu-el-texto-usa-los-tokens-del-menu.md)

### Barra lateral
`AppSidebar` · `components/Sidebar.tsx` · `.app-sidebar` · `.nav-item`
Navegación sobre el sidebar de shadcn con los destinos de la Isla y en su orden: Inicio, Descubrir, Inbox, proyectos (anillo, contador y "…") y Nuevo proyecto; al pie Conectores, feedback, cambiar tema y medidor del plan. **Solo se monta en móvil**; en escritorio navega la Isla. ⌘B / Ctrl+B la pliega. → [repite la Isla](decisiones/2026-10-06-el-menu-de-movil-repite-la-isla.md)
- En táctil el "…" de cada proyecto es siempre visible y el contador va a su izquierda; el nombre largo acaba en elipsis antes de los dos.
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
Foto o inicial sobre un tono derivado del nombre. En tarjetas, documento, hilos de área y comentarios. Es anterior al `Avatar` del sistema (tonos moss, butter, ember con `toneFor`); pendiente de unificar.

### Selector de tema
`ThemeSwitch` · `components/ThemeSwitch.tsx` · `.theme-seg` · muestra: segmentado
El `SegmentedControl` de papel con `choice`, Sistema / Claro / Oscuro. Aplica `data-theme` al momento, lo guarda en el navegador y sigue `prefers-color-scheme` en vivo. Solo en Ajustes › Cuenta.

### Botón de tema
`ThemeToggle` · `components/ThemeToggle.tsx` · `.theme-float` · `.theme-toggle`
Un clic entre claro y oscuro. En escritorio, un botón de cromo de 36 px (`--chrome`, línea `--chrome-border`) que flota en la esquina inferior derecha, a 16 px de cada pared (el mismo margen que la pastilla de la esquina izquierda) y apagado hasta que se acerca el puntero; en móvil, la fila "Cambiar tema" al pie de la barra lateral. Está en toda la app, también antes de entrar: portada de invitado (`GuestStart`) y login. → [decisión](decisiones/2026-10-06-boton-de-tema-flotante-en-la-esquina.md) Enseña el tema al que lleva (sol en oscuro, luna en claro). El cambio funde la página entera en 600 ms (`switchTheme`). No ofrece "Sistema": eso sigue en el selector de Ajustes. → [decisión](decisiones/2026-10-06-boton-de-tema-flotante-en-la-esquina.md)

### Selector de idioma
`LangSwitch` · `components/LangSwitch.tsx` · `.select`
Cada idioma escrito en su propio nombre. Guarda cookie y cuenta, y vuelve a pintar en el servidor.

### Herramienta de feedback
`FeedbackTool` · `FeedbackEntry` · `components/FeedbackTool.tsx` · `.fb-dock`
Capa sobre Agentation: píldora "Dar feedback", panel de 3 pasos y "Enviar al equipo". El dock se arrastra y recuerda su sitio. z 100000, siempre encima. `FeedbackEntry` es su entrada al pie de las barras laterales. Solo con sesión: en la portada de invitado y en el login no se monta (ahí nadie puede enviar y el globo pisaba el botón de tema de la esquina). La barra de Agentation vive en un shadow root y se maneja desde `components/feedback-mode.ts`; su versión va fija. → [decisión](decisiones/2026-10-06-la-herramienta-de-feedback-va-con-version-fija.md)

### Esqueleto
`.sk` · `app/globals.css` · muestra: skeleton
Brillo que recorre una superficie mientras carga (`shimmer`, 1.6 s). Lo que espera ocupa ya su forma final.

### Relleno líquido de pestañas
`Liquid` · `afterPaint` · `components/ui/liquid.tsx` · `.liquid` · `.liquid__pill`
Envuelve un grupo de pestañas y pinta sus rellenos como dos pastillas: la del hover fluye de pestaña en pestaña siguiendo al puntero; la de la elegida no viaja, salta a la pestaña en el mismo clic, con el texto ya en su color. Lee la elegida del DOM (`aria-selected`, `aria-pressed` o `on`) y acepta `as` (`div`, `nav`, `span`). `afterPaint` lanza lo que abre el clic después de pintar ese fotograma, para las vistas pesadas. Colores por control con `--liquid-on`, `--liquid-hover`, `--liquid-ring`, `--liquid-ink` y `--liquid-ink-off`. Lo usan los controles segmentados, Tablón / Pulido / Sistema y la Isla. → [decisión](decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md)

### Pastilla de la esquina: zoom y música
`ZoomPill` · `components/ZoomPill.tsx` · `.zoom-pill` · `SoundControl` · `components/SoundControl.tsx`
La única pieza que flota abajo a la izquierda, a 16 px de cada pared (como el botón de tema en la esquina contraria), en toda la app con sesión iniciada, la casa incluida; antes de iniciar sesión (portada de invitado, login) no está la pastilla, aunque sí el botón de tema (`.board-zoom` en los tablones y las demás vistas, `.polish__corner` en Pulido, `.shell-corner` en Ajustes, biblioteca de diseño y actividad). → [decisión](decisiones/2026-10-06-zoom-y-musica-comparten-la-pastilla-de-la-esquina.md)
- Zoom (− % +): columnas en los tablones, tamaño del tornado en Pulido; las demás vistas no tienen (`zoom={null}`) y la pastilla es el altavoz solo.
- Música, tras una línea fina: el altavoz (`.zoom-pill__sound`) enciende y apaga con un clic; mientras suena, la flecha (`.zoom-pill__track`) abre las canciones por nombre (`.sound-tracks`, un menú `.island-pop` sobre el cromo de la pastilla) y gira con él: 200 ms al abrir, 150 al cerrar (Eric, 06-10: "que gire acompasado"). Seis pistas en `public/polish/` (lista `TRACKS`), que no se descargan hasta encenderla; entra y sale con fundido y al acabar una sigue la siguiente. → [las pistas](decisiones/2026-10-06-la-musica-de-pulido-se-elige-por-nombre.md)
- Siempre arranca apagada al abrir o recargar la página; solo se recuerda la última canción.
- El audio es uno para toda la página y no se corta al cambiar de pantalla ni de pestaña del navegador (sigue sonando en segundo plano). Suena solo mientras uno de sus botones está en pantalla.
- En móvil solo Pulido la tiene, arriba bajo la barra.

## Biblioteca y tablero

### Biblioteca
`InspoClient` · `components/InspoClient.tsx` · `.shell` · `.topbar` · `.dock`
La app: barra superior (Isla, logo, acciones), selector Tablón / Pulido / Sistema, el "+" y, abajo, el dock con la barra de reunir, la respuesta del agente y el buscador. Según el espacio activo enruta a Descubrir, Inicio, Inbox, tablero, Pulido o Sistema.
- Atajos: ⌘K paleta, N añadir, "/" buscador (o sobre una tarjeta, entregarla al agente).
- En teléfono el selector de vista conserva los nombres a 12 px y solo la vista activa su cifra; el logo se va cuando hay selector. Entre 801 y 1100 px el selector va solo con iconos para que las pestañas de la Isla conserven sus nombres.

### Respuesta del agente
`AgentCard` · `components/InspoClient.tsx` · `.dock__agent`
Lo que el agente hizo, con deshacer; sus preguntas con opciones; y lo destructivo pendiente con Hazlo / Déjalo.

### Tablero
`Grid` · `components/Grid.tsx` · `.board`
Masonry con scroll vertical. El layout son números (ratio de cada tarjeta) y solo se montan las tarjetas cercanas a la pantalla.
- Zoom por columnas: `ZoomPill` (`components/ZoomPill.tsx`, `.zoom-pill`: − % +), colocada por `.board-zoom` en la esquina inferior izquierda, a 16 px de cada pared; pellizco o ⌘/Ctrl+rueda. Abre un paso más lejos que el 100 %. Pulido usa la misma pastilla en la misma esquina.
- La pastilla lleva también la música (`SoundControl`, ver Pastilla de la esquina), en cualquier tablón.
- Las tarjetas se deslizan a su nuevo sitio con una transición CSS de `transform`.
- Cada tarjeta pide la copia de captura que necesita: 288, 720 o 1440 px.

### Tarjeta de referencia
`InspoCard` · `components/InspoCard.tsx` · `.tile`
La miniatura en su forma real: web (og:image, captura o póster tipográfico), imagen, vídeo en bucle o texto.
- Nota con avatares, chips de etiquetas y estado "reuniendo".
- Abajo: Archivar en proyecto, Al sistema y Comentarios. Al pasar el ratón, la página hace scroll dentro de la tarjeta.
- Arriba a la derecha: Ver URL, los tres puntos (solo la miniatura) y la papelera, que dice de dónde quita la tarjeta. En el tablón de un proyecto dice "Quitar del proyecto", la saca con un clic y la tarjeta vuela a la pestaña Inbox de la Isla como en Pulido (`components/fly-to-inbox.ts`, `.tile-fly`); fuera, "Quitar de" y el nombre del espacio. → [decisión](decisiones/2026-10-06-en-un-proyecto-la-papelera-saca-la-tarjeta-al-inbox.md) Fuera de un proyecto borra: son dos clics seguidos sobre la papelera, que al primero pasa a decir "Borrar" en rojo en el mismo sitio; Esc, sacar el puntero o 6 s lo cancelan. → [decisión](decisiones/2026-10-06-borrar-tarjeta-con-dos-clics-en-la-papelera.md) La papelera solo se pinta para quien puede borrar la referencia: quien la guardó o quien gestiona el espacio (`deletable`). → [decisión](decisiones/2026-10-06-un-miembro-borra-lo-suyo-y-los-admins-el-resto.md)
- Arriba a la izquierda: el círculo de selección (al pasar el ratón o mientras se selecciona) y, tras una búsqueda, el porcentaje de encaje con su porqué. Cuando el círculo aparece, el porcentaje y el chip GIF se apartan 32 px a la derecha. → [decisión](decisiones/2026-10-06-el-estado-de-etiquetado-no-acompana-a-la-busqueda.md)

### Barra de selección
`SelectBar` · `components/SelectBar.tsx` · `.selbar`
Varias referencias a la vez: ⌘ o ⇧-clic en una tarjeta (o su círculo) y la barra ocupa el sitio del dock, sobre el mismo cromo (`--chrome-panel`).
- Cuenta, "Seleccionar todo" (lo que hay en el tablero a la vista; desaparece cuando ya está todo) y Listo.
- En la librería y el Inbox: Añadir a proyecto y Borrar. Borrar pide confirmación con el número de referencias y se lleva también sus comentarios y ficheros. Si la selección lleva referencias de otra persona y quien borra no gestiona el espacio, no se borra a medias: se rechaza entera con un mensaje. → [decisión](decisiones/2026-10-06-un-miembro-borra-lo-suyo-y-los-admins-el-resto.md)
- Dentro de un proyecto: Mover y Quitar (vuelven al Inbox, no se borran).

### Selector de proyecto
`ProjectPicker` · `components/ProjectPicker.tsx` · `.pp-step` · `.cr-picker`
Dos pasos: el proyecto y luego sus 8 áreas, con campo para crear proyecto y archivar a la vez. El botón es primario (ember, con la carpeta) cuando la referencia ya está en algún proyecto y secundario "Añadir a un proyecto" cuando no; los elegidos se invierten a tinta. En la tarjeta, panel compacto (320 de ancho, letra de 15). → [decisión](decisiones/2026-10-07-el-selector-de-proyecto-es-primario-cuando-la-referencia-tiene-proyecto.md)

### Selector de área
`AreaPicker` · `components/AreaPicker.tsx` · `.pp`
Las 8 áreas, marcadas donde la referencia ya cuenta.

### Añadir referencia
`AddInspoModal` · `components/AddInspoModal.tsx` · `.add`
Pegar enlace, subir, soltar o pegar con ⌘V una imagen, o pegar texto (varias líneas = referencia de texto). Dentro de un proyecto deja elegir áreas. Se abre con N, el "+" o la paleta.
- El modal plano (`DialogContent` con `.modal__header`), no la ventana moss; el guiño retro es el marco de tinta y los botones con bisel. Dentro, el formulario empaquetado: campos de 44 sin pozo (en Board, `--surface-2`), 12 px entre piezas, las otras dos entradas (`.add__pick`) como recuadros discontinuos transparentes y las áreas (`.add__area`) como pastillas de 28 (transparentes, la elegida invertida). Dos grises en todo el interior (`--add-line`, `--add-quiet`). → [decisión](decisiones/2026-10-07-anadir-es-el-modal-plano-con-el-formulario-empaquetado.md)

### Buscador y barra del agente
`SearchBar` · `components/SearchBar.tsx` · `.sb`
Caja fija abajo, con chips de filtro (persona, fecha, color, sección…) y sugerencias que se abren hacia arriba. Enter o ⌘Enter manda la orden al agente.
- Solo sale sobre un tablón con referencias: un proyecto vacío empieza por su propia caja (`ProjectStart`) y no lleva buscador. → [decisión](decisiones/2026-10-06-el-buscador-solo-sale-sobre-un-tablon-con-referencias.md)
- Muestra la tarjeta marcada con "/" como objetivo.
- Esc en cascada: cierra la lista, vacía, quita chips, quita objetivo, suelta el foco.
- A la derecha, mientras se busca, solo acciones: el botón del agente y la equis. El aviso "Etiquetando N referencias" (trabajo en segundo plano) solo sale con la caja vacía. → [decisión](decisiones/2026-10-06-el-estado-de-etiquetado-no-acompana-a-la-busqueda.md)

### Barra de reunir referencias
`GatherBar` · `components/GatherBar.tsx` · `.gather`
Pegada al dock: recuento, tres miniaturas apiladas, "Añadir" y "Ya tengo mis referencias", que marca el proyecto como empezado y lleva siempre al Sistema (no pasa por Pulido, que es una pestaña aparte). En teléfono (≤640 px) es una fila: el título y el botón; miniaturas, recuento, entradilla y "Añadir" fuera (añade el "+" de la barra).

### Pulido
`PolishView` · `components/PolishView.tsx` · `components/PolishView.css` · `.polish`
La fase entre el Tablón y el Sistema (`?view=polish`): lo que queda por decidir del tablón, en un slider con forma de tornado 3D; la tarjeta de delante ocupa más sitio y es la que se decide. → [la fase](decisiones/2026-10-06-vuelve-pulido-como-fase-entre-tablon-y-sistema.md), [cómo se decide](decisiones/2026-10-06-en-pulido-la-tarjeta-decidida-vuela-a-su-pestana.md)
- La matemática es la del "3D cards tornado" de Osmo Supply, en `requestAnimationFrame` y sin GSAP; sus parámetros son las constantes del principio del fichero. Ventaneado: solo se montan las tarjetas cercanas a la pantalla (unas 33 en un tablero de 134).
- Es un slider manual, siempre: se mueve con la rueda, arrastrando o al decidir, y descansa sobre una tarjeta. Cada vez que se entra, la tarjeta de delante es otra, al azar entre las pendientes (`lastFront`). La de delante es una más del tornado, más grande (`FRONT_W` frente a `CARD_W`) y con las vecinas un poco apartadas (`SPREAD`); en reposo carga su captura grande. Clic en ella abre su ficha, sola: sin flechas ni anterior y siguiente, porque el slider aquí es el tornado (`panelAt` en `InspoClient.tsx`); clic en otra la trae delante. → [decisión](decisiones/2026-10-06-en-pulido-la-ficha-se-abre-sola.md)
- Las respuestas (`.polish__bar`, donde va el dock en el tablón): el pie de la tarjeta de delante (`.polish__now`) y una pieza en dos mitades del mismo peso (`.polish__choice`), **Olvidar** ("Vuelve al Inbox": sale del proyecto, no se borra) y **Conservar** ("Se queda en el tablón"), cada una con la flecha de su tecla. Deshacer aparece al lado cuando hay algo que deshacer. Atajos ← → y ⌘Z.
- El pie dice lo que hace falta para decidir sin abrir la ficha, y cada cosa con la cara de quien la dijo, como bajo una tarjeta del tablón (`.tile__note`): de una web o una imagen, su nombre (`.polish__name`, hasta dos líneas); de un post de X, una fila (`.polish__say`) con el avatar de su autor, su nombre y lo que dice en hasta tres líneas, sin sus enlaces; debajo, lo que dijo el equipo (`.polish__say--note`, dos líneas, más apagado): la nota de quien guardó la referencia o, sin nota, el primer comentario, con su avatar (`Avatar`, 18 px) o las caras apiladas si hay más voces en la conversación (`.polish__faces`). Sale de `captionFor` (`InspoCard.tsx`), el mismo dato que el pie de la tarjeta. Una nota larga se corta: dos líneas a la vista y `NOTE_MAX` (280) caracteres en la página; entera se lee en la ficha. El texto del post se pide a `/api/post` cuando la tarjeta lleva un momento delante (`POST_WAIT`) y se guarda para la sesión (`postWords`); mientras llega se lee el arranque que ya trae el nombre. Sin IA: es lo que ya estaba escrito. Cuántas le quedan a cada persona lo dice la pestaña Pulido de la barra (`.topbar__fill`, como el 0/8 de Sistema), desde cualquier vista del proyecto; nombre y número comparten línea base (`.topbar__label`). → [decisión](decisiones/2026-10-06-el-pie-de-pulido-ensena-el-texto-del-post-y-la-nota.md)
- Decidida, la tarjeta sale del tornado (solo gira lo pendiente) y se ve adónde va: una copia (`Flyer`, `.polish__fly`) vuela a la pestaña Tablón si se conserva o a la pestaña Inbox de la Isla si se olvida, que da un bote al recibirla (`LANDING`, WAAPI), y las demás cierran el hueco. La olvidada sale del proyecto cuando aterriza, así el contador del Inbox sube justo entonces; deshacer mientras vuela no llega al servidor.
- Lo decidido se guarda en el servidor, por persona (tabla `polish_vote`, `lib/polish-votes.ts`): al volver solo se pregunta por lo nuevo, en cualquier navegador. Con todo decidido (`.polish__done`) el tablón que se ha quedado gira solo, lejos y desenfocado entero, y encima cae en su sitio lo hecho, escalonado: hasta cinco de las referencias que se quedan ordenándose en abanico (`.polish__fan`), "Todo está en orden", el aviso de que se podrá volver a pulir cuando entren más referencias, "Ir al sistema" (que marca el proyecto como empezado) y "Repasarlo otra vez".
- **En un espacio de equipo es una votación** (más de un miembro; a solas todo lo de arriba sigue igual y cada respuesta se aplica al momento). → [decisión](decisiones/2026-10-06-en-equipo-el-pulido-es-una-votacion-que-se-cierra.md)
  - Olvidar y Conservar son el voto de cada persona ("Tu voto: que salga", "Tu voto: que se quede"): nada sale del tablón al votar y la tarjeta vuela a la pestaña Pulido. Bajo las dos mitades, en la misma pieza, una línea lo dice siempre (`.polish__team`): "Aquí vota todo el equipo: sale lo que todos olvidan."
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
`ProjectChooser` · `Cover` · `components/ProjectChooser.tsx` · `.chooser` · `.cr-hello`
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
Tres pestañas: Ejemplos (`?in=templates`, antes Plantillas), Recursos (`?in=discover`) y Skills (`?in=skills`). Las tres comparten cabecera, en la columna del contenido y con el patrón de la página de proyecto: el nombre "Descubrir" y la entradilla de la sección (`.disc-head`) y, debajo, una fila (`.disc-bar`) con las pestañas a la izquierda y los controles de la sección a la derecha; la cabecera entera se va con la página al hacer scroll. → [decisión](decisiones/2026-10-06-la-cabecera-de-descubrir-va-en-la-columna-del-contenido.md) Las tres columnas la ponen a la misma altura: cambiar de sección no la mueve. → [decisión](decisiones/2026-10-07-la-cabecera-de-descubrir-no-se-mueve-al-cambiar-de-seccion.md) Recursos agrupados (Todo, Nuevos, Más abiertos), cada fila con una miniatura del hero de la web que sigue al ratón (`.disc-peek`, seguimiento con requestAnimationFrame y entrada con WAAPI; solo ratón, con reduced-motion solo fundido), y ejemplos: sistemas completos cuya miniatura hace scroll al pasar el ratón; abrir uno enseña su criterio.md y deja crear un proyecto con él. → [se llaman ejemplos](decisiones/2026-10-06-plantillas-se-llaman-ejemplos.md) Las tarjetas de ejemplo enseñan Clonar y Ver al pasar el ratón, con los botones del tablón (`.tile__go-btn`). → [decisión](decisiones/2026-10-06-tarjetas-de-ejemplo-con-clonar-y-ver-al-pasar.md)
- Skills (`components/DiscoverSkills.tsx`) son tarjetas, no filas, y todas son skills de agentes: avatar y autor, nombre (title-s), qué hace y el comando `npx skills add …` en un pozo hundido (`.disc-skill__install`: `--field` y línea `--border`, mono apagado) con Copiar como tecla pequeña en `--surface-2`, sin papel ni `Button`; toda la tarjeta abre su página. → [decisión](decisiones/2026-10-07-el-comando-de-instalar-una-skill-no-es-un-boton-de-papel.md) Agrupadas por tema (`SKILL_TOPICS` en `lib/directory.ts`, con el encabezado `.disc-list__head` de los recursos, un `h2` en title-m → [decisión](decisiones/2026-10-07-los-grupos-de-descubrir-se-titulan-en-title-m.md)), con las pestañas Todo, Recién llegados y Destacados (`FEATURED_SKILLS`) y el menú "Temas" a la derecha de la barra, como en Recursos, y, dentro de cada tema, primero las 13 de criterio.design (`MD_SKILLS` en `lib/md-skill-ids.ts`, nombre y descripción de `t.system.skillsList`, instaladas desde el repo público `criterio-skills` que escribe `scripts/build-skills.ts`) y después las de otros autores (`SKILLS` en `lib/directory.ts`); de estas, las que también están en criterio.md llevan la pastilla "En criterio.md" (`.disc-row__skill`). → [skills en Descubrir](decisiones/2026-10-05-skills-pestana-propia.md), [todas de agentes](decisiones/2026-10-06-todas-las-skills-son-de-agentes.md), [por temas](decisiones/2026-10-06-las-skills-de-descubrir-van-por-temas.md)

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
Un botón en la barra superior (icono `Plug`) con las dos formas de entrar desde fuera, de la cuenta y no del proyecto: la extensión de Chrome (instalarla o conectarla) y Conectar MCP (icono `Cable`). Con `row` es una fila del menú de móvil con el mismo menú. Cada fila con su tic cuando está conectada. El botón se queda siempre, también con las dos conectadas: es el único sitio donde ver las apps que tienen acceso y desconectar una. Sustituye al aviso "Instalar extensión". → [decisión](decisiones/2026-10-06-conectores-se-queda-siempre-en-la-barra.md)

### Conectar tu IA
`ConnectDialog` · `components/ConnectDialog.tsx` · `components/ConnectDialog.css` · `.mcpc`
Se abre desde la fila "Conectar MCP" del menú Conectores. Primero "Qué hace por ti": los cuatro usos (diseñar desde el criterio, traer lo que ya tienes, guardar lo de una conversación, revisar contra el criterio) y la regla de que nunca reescribe el fichero (Eric, 06-10: "igual hay que explicar qué podrá hacer por ti"). Luego la dirección del conector MCP (`/mcp`) con Copiar, un control segmentado con los pasos para Claude, ChatGPT, Claude Code (el comando) y Cursor (el JSON), y las aplicaciones conectadas con Desconectar. Nada más se teclea aquí: el cliente entra por OAuth. Recuerda el cliente elegido en el navegador. → [conector MCP](decisiones/2026-10-06-conector-mcp-lee-el-md-y-escribe-piezas.md)

### Permiso a una aplicación
`AuthorizePanel` · `app/mcp/authorize/` · `.auth--solo`
La página a la que un cliente de IA manda a la persona para entrar: con el mismo diseño que aceptar una invitación (logo, una frase grande con qué app pide, qué podrá hacer, a qué espacios llega, Permitir en primario y Cancelar), y "Entras como". Sin sesión, pasa por /login y vuelve con la misma petición. No se puede mostrar dentro de un frame de otra web.

### Documento criterio.md
`SystemDoc` · `components/SystemDoc.tsx` · `.sdoc`
La vista Markdown: el fichero con índice lateral y un punto de estado por área (respaldada, abierta, del equipo), las propuestas y las skills. Las propuestas se aceptan, rechazan o retiran bajo su área.

- En teléfono el índice es una fila que se desplaza de lado y la barra del fichero otra, sin la pista de texto: el fichero empieza en la primera pantalla. → [móvil](decisiones/2026-10-06-en-movil-cada-vista-cabe-en-la-primera-pantalla.md)
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
`ItemPanel` · `components/ItemPanel.tsx` · `.ip` · `.cr-viewer`
Hoja sobre el lienzo: favicon, nombre, migas, pestañas Página / Criterio y cerrar; la página a la izquierda y la conversación a la derecha. Las flechas ← → (y los botones a los lados) recorren el tablero en su orden; abierta desde Pulido es esa referencia sola, sin flechas.
- Si un pulido cerrado la sacó de un proyecto, lo dice encima de la conversación (`.cm-notice`, prop `notice` de `CommentsPanel`): "Olvidada en el pulido de Landing Savvia: Eric y Andoni", con "Devolver al tablón", que la devuelve y borra sus votos allí para que se vuelva a votar (`restoreToBoard`). Quitarla del tablón a mano no deja aviso.
- Crece desde el punto del clic (WAAPI, `--ease-out`); al cerrar, 0.96 con fundido de 150 ms. Con reduced-motion, solo fundido. Esc cierra.
- z 30 en escritorio, 60 en móvil. En teléfono las flechas son de 32 px sobre la página, un deslizamiento horizontal pasa de referencia, y un botón de la barra (`.ip-bar__talk`, icono `comment`) baja a la conversación, que va debajo. En ventanas de menos de 500 px de alto la hoja ocupa casi todo. → [móvil](decisiones/2026-10-06-en-movil-cada-vista-cabe-en-la-primera-pantalla.md)

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
`SectionShell` · `components/SectionShell.tsx` · `.settings`
El marco de Ajustes, Actividad y esta librería: sidebar con grupos e iconos, migas y contenido a 800 px (1040 con `wide`).

### Encabezado de sección
`SettingsHeading` · `components/SettingsHeading.tsx` · `.settings__heading`
Un `h1` (sin clase: el elemento ya da el tamaño), entradilla en `.t-body` y un aparte opcional a la derecha (selector de periodo, fuente…).

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
`LoginForm` · `components/LoginForm.tsx` · `.auth`
Enlace mágico, Google, Apple y X, recordando el último método. Al lado, el collage fijo de `public/showcase/`, curado a mano. La página mide lo que la ventana (`.auth:not(.auth--solo)`, `100dvh`): el pie (`.auth__foot`), con la aceptación de Términos y Privacidad (siempre: `legalShown()` ya no oculta nada), se lee sin scroll; si la ventana es más baja que el formulario, hace scroll el panel. → [decisión](decisiones/2026-10-06-el-login-mide-la-ventana-y-su-pie-se-ve-sin-scroll.md)
- El panel sigue el tema (oscuro en Board, papel en Paper), ya no fuerza Paper. El formulario es plano, como antes del sistema: campo y botones sociales de 46 sobre la superficie con línea de 1 px, sin pozo negro ni bisel (`.auth__panel` redefine los tokens de campo y `.btn`); el único bisel es el CTA ember. "Último usado" es una pastilla pequeña de 12 px en `--surface-2`, pegada al final del botón, que no alcanza el texto. Pista a 15, etiqueta y pie a 12. → [decisión](decisiones/2026-10-07-el-login-es-plano-y-enlaza-siempre-a-terminos-y-privacidad.md)

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
- Un solo primario: volver a la librería en la 404, volver a intentarlo en el error (la librería pasa a `Button` secundario).
- Las cifras son decoración (`aria-hidden`, texto al 12 %); el título sigue siendo el `h1`.
- Por encima de 96 px `Logo` usa `icon-512.png` para que la cabeza no se vea blanda.
- `LostTheme` pone el tema al montar: una 404 o un error lanzados desde una página se pintan enteros en el navegador y el script de tema del `<head>` no llega a ejecutarse.
- `app/global-error.tsx` (falla el layout raíz) sigue sin estilos a propósito.
