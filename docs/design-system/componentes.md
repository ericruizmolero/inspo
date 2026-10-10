# Componentes

Cada pieza de la app con su nombre en castellano (el que usamos al hablar), su nombre técnico, su fichero y lo que hay que saber para usarla. Antes de crear algo, búscalo aquí; si creas una pieza reutilizable, añade su ficha. Cada ficha del sistema lleva una muestra viva pintada con el CSS real de la app; no hay capturas. → [muestras vivas](decisiones/2026-10-07-la-libreria-pinta-muestras-vivas-sin-capturas.md)

## Sistema Criterio

Los componentes del sistema de diseño Criterio (`components/criterio/index.tsx`, `components/criterio/criterio.css`, clases `cr-*`), portados de su bundle y ampliados aquí: una ficha por export. Antes de dibujar algo, búscalo en esta pestaña; las clases viejas con la misma función (`.btn`, `.input`, `.pill`) ya no existen. La criatura solo es el logotipo: `Creature`, `Profile` y `Sprite` siguen fuera. → [decisión](decisiones/2026-10-07-sistema-de-diseno-criterio.md)

### Botón
`Button` · `components/criterio/index.tsx` · `.cr-btn` · muestra: botones
Grueso, con borde de tinta y bisel; al pulsar se hunde (`--bevel-pressed` y 1 px abajo). `primary` (ember) es la acción para la que existe la vista, una por vista, y lo que ya era primario no se baja; `secondary` (papel, la variante por defecto) todo lo demás, también Cancelar y Ahora no; `dark` (tinta) una segunda acción fuerte sobre papel; `quiet` sin borde, bisel ni relleno hasta el hover, para acciones pequeñas dentro de barras y paneles, casi siempre con icono; `danger` (`--danger-deep`) solo para confirmar algo que destruye. → [lo que era primario](decisiones/2026-10-07-lo-que-era-primario-sigue-siendo-primario.md)
- Tallas: s 34 (globos, ventanas y sus pies, barras de herramientas, menús, la tarjeta del tablero), m 44 (la normal en producto: páginas y vistas), l 52 (héroes). En una misma barra, todos en la misma talla. Sin excepciones locales de alto, relleno, letra o radio; solo dos: el botón partido junta sus esquinas y el botón dentro de un campo (`.cr-textbox-bar`) lleva radio 6.
- `icon` delante, `iconEnd` detrás ("Ya tengo mis referencias" lleva la flecha); `pressed` lo deja hundido; `href` lo vuelve un enlace.
- Es el único botón de texto. Cuando el botón tiene que ser otro elemento (un `PopoverTrigger`, un `Link` de Next, un `<a>` con `download` o `target`, un `<label>` de fichero), ese elemento lleva las clases del sistema: `cr-btn cr-btn-{variante} cr-btn-{talla}`. `.btn`, sus variantes y `components/ui/button.tsx` ya no existen.
- Etiquetas en sentence case, verbo primero, cortas. Desactivado: relleno `--disabled`, texto `--disabled-text`, borde `--disabled-border`, sin bisel.

### Botón de icono
`IconButton` · `.cr-iconbtn` · muestra: boton-icono
El único botón de solo icono de la app: siempre redondo, un icono y su `label`, que es también el tooltip (`data-tip`). Tres variantes: quiet (sin relleno hasta el hover, dentro de barras), default (relleno con línea fina, acciones sueltas), strong (papel, borde de tinta y bisel, la más importante de su fila). Tallas xs 24, s 32, m 40, l 48, con iconos de 14, 16, 18 y 20. `active` marca el sitio actual; con `toggle` es un interruptor (el sonido) y `active` se anuncia como pulsado. → [decisión](decisiones/2026-10-07-un-solo-boton-de-icono-redondo.md)
- En una tarjeta del tablero, s como mucho. Sobre el cromo, el contenedor lleva `cr-on-chrome` y los botones leen los tokens del cromo.
- Los nombres viejos siguen funcionando (`ghost` = quiet, `chrome` y `round` = default, `raised` = strong).

### Control segmentado
`SegmentedControl` · `SegmentItem` · `.cr-seg` · `components/ui/liquid.tsx` · muestra: segmentado
Vistas excluyentes, una activa. Cada opción es un `SegmentItem` (`label`, `icon`, `count`, `dot`, `title`). `tone` `chrome` sobre el cromo (el selector Tablón / Pulido / Sistema) y `paper` en la página; `choice` lo vuelve un grupo de radio (tema, idioma, rol) en vez de pestañas. Pasa por `Liquid`: el hover fluye de opción en opción y la elegida cambia en el mismo clic.
- El de papel es un pozo hundido con borde sutil (`--border`, 1 px) y la elegida como tecla con bisel. Dos tallas: m (44, junto a un `Button` m) y s (`size="s"`, 34, en una fila de herramientas dentro de la página, junto a botones s: Descubrir). → [decisión](decisiones/2026-10-07-el-segmentado-de-papel-tiene-talla-s-y-un-borde-sutil.md)

### Pregunta de inicio
`PromptInput` · `.cr-prompt` · muestra: prompt
La única pregunta de la casa: un campo grande y redondeado con el botón redondo de enviar, que se enciende cuando hay texto. `leading` pone algo delante (adjuntar), `below` una segunda línea dentro de la misma forma, `busy` cambia la flecha por la espera. `inputRef`, `onKeyDown`, `onPaste` e `inputProps` para lo que el campo necesite (pegar una URL, una imagen). También es la caja de Inbox vacío y de proyecto vacío.

### Campo de texto
`TextField` · `.cr-field` · `.cr-input` · `components/ui/input.tsx` · muestra: campo
El pozo hundido (`--field`, `--sunken`, 44 de alto, radio `--radius-md`; talla s de 34 con letra pequeña, `.cr-input-s`, junto a un `Button` s): casi negro con texto papel en Board, blanco con tinta y línea suave en Paper. `label` arriba en pequeño y apagado; `hint` debajo, y con `.cr-field-hint.is-error` el error va bajo el campo. Un campo de solo lectura o desactivado se ve plano y apagado. → [campos en Board](decisiones/2026-10-07-los-campos-tienen-version-oscura.md)
- `Input` de `components/ui/input.tsx` (Base UI) es el mismo pozo, `.cr-input`, sin etiqueta encima: para los campos que solo llevan placeholder (añadir una referencia, importar un tablero, confirmar escribiendo el nombre). Un `<select>` o un `<textarea>` sueltos llevan `.cr-input` (y `.cr-textarea`) igual; `select.cr-input` pinta su flecha.

### Área de texto y compositor
`TextArea` · `.cr-textarea` · `.cr-textbox` · muestra: compositor
El gemelo de varias líneas del campo. Con `toolbar` se vuelve el compositor (comentar, responder, editar): el textarea, lo que se pase como hijos (adjuntos esperando) y una barra de herramientas (`.cr-textbox-bar`, herramientas `.cr-textbox-tool`) dentro de un solo campo, y el foco rodea el campo entero. En el compositor de comentarios la mini ayuda (`.cm-composer__keys`: ↩ envía, ⇧↩ salto de línea, ⌘V pega capturas) va debajo del campo, entera y en tamaño label; dentro de la barra se cortaba y estorbaba. "Subiendo captura…" sí sale en la barra mientras sube. → [decisión](decisiones/2026-10-07-el-compositor-de-comentarios-ensena-su-ayuda.md)

### Casilla
`Checkbox` · `.cr-check` · muestra: casilla
La casilla hundida con el tic de tinta y su etiqueta al lado. Controlada (`checked`, `onChange`) o con `defaultChecked`.

### Interruptor
`Switch` · `.cr-switch` · muestra: interruptor
Encendido y apagado: pista hundida (copia el pozo de la casilla), perilla de papel con bisel (copia el botón) y ember encendido. Siempre con `label`; `role=switch`. → [las piezas pequeñas](decisiones/2026-10-07-las-piezas-pequenas-copian-a-las-grandes.md) Dentro de un `FieldRow` guarda su tamaño (34 por 20), no se estira como un campo.

### Chip
`Chip` · `.cr-chip` · muestra: pastillas
Etiquetas con borde de tinta: paper (por defecto), butter (sugerencias), ember (una regla activa), moss (bibliotecas), chrome (sobre el cromo y en las sugerencias de los vacíos). Con `onClick` es un botón; `pressed` lo invierte a tinta con texto papel (con borde papel en Board); `onRemove` añade una x (un filtro). Elegido no es ember. `.pill` es el nombre viejo; quedan dos usos.
- Dentro de un formulario en el modal plano (Añadir, Mejorar con IA) las Chips van en `.pills--line` (`app/globals.css`): pastillas de 28, transparentes, línea suave `--border` y texto `--muted`; la elegida va en el cristal de la Isla (`--glass-on`), sin borde, no invertida a blanco. → [decisión](decisiones/2026-10-07-anadir-es-el-modal-plano-con-el-formulario-empaquetado.md), [Mejorar con IA en el modal plano](decisiones/2026-10-08-mejorar-con-ia-es-el-modal-plano-sin-barra-ni-tarjeta.md)
- Las áreas del popup de la extensión (`.pill` en `extension/chrome/popup.css`) van igual: oscuras y calladas, solo la elegida se invierte a papel. → [decisión](decisiones/2026-10-08-las-areas-del-popup-son-pastillas-oscuras.md)

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

### Sección de ajustes
`SettingsWindow` · `.cr-swin` · muestra: ventana-ajustes
Cada sección de Ajustes, Actividad y `/admin` va plana sobre la página, a todo el ancho de la columna: una línea `--border` encima, el nombre (`h2` en `t-title-m`) con una cifra opcional a su derecha (`figure`, texto tabular apagado, nunca un chip), la descripción debajo del nombre, el cuerpo y el pie con una nota a la izquierda (`note`: un aviso, un éxito o un error de toda la sección) y las acciones a la derecha (`actions`); los pies miden 44 como mínimo para que las columnas de los planes alineen, y sus botones son `Button` s. Sin marco, sin bisel y sin barra moss: eso queda para los diálogos. Las listas dentro: filas de 52 como mínimo, avatar 32, solo líneas finas. En Personas el estado es un punto `--success` y la palabra (`.ad-state`), no un chip. → [decisión](decisiones/2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md)

### Fila de campo
`FieldRow` · `.cr-fieldrow` · muestra: fila-campo
Un ajuste en una línea: la etiqueta en una columna de 200 (con su `hint` debajo) y el control con su `action` en la otra, todo en talla s (34: `Button` s, segmentado de papel s, el campo y el select a 34 con letra pequeña) y centrado; el `error` va debajo del control. → [decisión](decisiones/2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md) Se apila por debajo de 560 px. `htmlFor` cuando el control es un campo (la etiqueta pasa a `label`); un grupo de radio o una imagen se nombran solos.

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
El estado de un tablero: anillo moss al día (`synced`), punto ember algo nuevo (`new`), anillo apagado sin empezar (`idle`). Con `progress` (0 a 1) es un indicador: solo el arco moss, sin pista gris, tantos grados como áreas decididas (7 de 8 es un anillo casi cerrado; 0 deja el anillo apagado); el punto ember lo ignora. Con `label` propio si el nombre por defecto no sirve. → [indicador](decisiones/2026-10-07-el-anillo-de-estado-es-un-indicador-de-areas-decididas.md)

### Progreso
`Progress` · `.cr-progress` · muestra: progreso
Progreso en bloques ember dentro de un pozo hundido (`segments`, 22 por defecto). Siempre junto a un texto que diga qué pasa; `label` para el lector de pantalla.

### Avatar
`Avatar` · `AvatarStack` · `toneFor` · `AvatarTone` · `.cr-avatar` · `.cr-avatars` · muestra: avatar
Iniciales (o la foto, `src`; si no carga, vuelven las iniciales) sobre un color de marca: moss, butter o ember, y `toneFor(nombre)` da siempre el mismo tono a la misma persona. Solo para personas; `chrome` y `square` para un espacio o una fuente. `AvatarStack` solapa varios. El `Avatar` y `hueFor` de `components/CommentsPanel.tsx` son la versión anterior, pendiente de unificar.

### Comentario
`Comment` · `.cr-comment` · muestra: comentario
Un comentario corto bajo una referencia: avatar de 20, autor en negrita y dos líneas como mucho. Bajo una tarjeta del tablón (`.tile__note`) el avatar y el contador de respuestas se centran en la primera línea del texto, calculado con los tokens, no en el borde superior del bloque. → [decisión](decisiones/2026-10-07-la-cara-de-un-comentario-se-centra-en-su-primera-linea.md)

### Tarjeta de tablero
`BoardCard` · `.cr-boardcard` · muestra: tarjeta-tablero
Un tablero en la casa: sus primeras referencias colocadas como las coloca el tablón (`columns`, cinco columnas con cada baldosa a su `ratio`, recortadas abajo) o un mosaico plano de hasta 8 `tiles`; el nombre, la cuenta (`countLabel`) y su anillo de estado (`status`, `progress`). Enlace con `href` o botón con `onClick`. Es la portada de proyecto de Inicio y de Inbox vacío. → [masonry en pequeño](decisiones/2026-10-07-la-portada-de-un-tablero-es-su-masonry-en-pequeno.md)

### Baldosa de referencia
`ReferenceTile` · `.cr-ref` · muestra: referencia
Una referencia guardada en pequeño, con su propia altura: imagen, vídeo (con el triángulo y la barra de reproducido) o enlace. La usa el mosaico de la tarjeta de tablero.

### Nota
`NoteCard` · `.cr-note` · muestra: nota
Una referencia de texto: etiqueta del tipo, título en display y el cuerpo que se desvanece abajo.

### Vacío
`EmptyState` · `.cr-empty` · muestra: vacio
Lo que dice un sitio vacío: un título corto, una o dos frases y `suggestions` como chips de cromo que rellenan el paso siguiente (`onSuggest`). Sin dibujo salvo que el vacío espere a personas concretas: entonces `art` lleva sus caras (la conversación). Lo usan los comentarios, la ficha, Pulido, Ajustes y Actividad. → [las caras del equipo en la conversación vacía](decisiones/2026-10-09-el-vacio-de-comentarios-lleva-las-caras-del-equipo.md)

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
- Las pestañas abiertas se guardan por navegador y espacio; el ancho se mide con un `.island__measure` oculto. Se vuelve a medir en cada render, cuando cambia de tamaño la barra o cualquier cosa que comparta barra con ella (la píldora de la derecha crece sola: Conectores, las caras de Pulido) y cuando terminan de cargar las fuentes web: la primera medida se hace con la fuente de reserva, y con Satoshi/Söhne cada pestaña es más ancha (09-10: el conmutador de vistas pisaba la última pestaña de proyecto). Y si aun así falta sitio, cede la pestaña del proyecto activo (es la única que siempre se queda, así que es la única que puede ser corta): Island.tsx le da su ancho natural (el de su copia en la medida) y un suelo de 150 px; entre los dos, primero se recorta el nombre con puntos suspensivos (mínimo 56 px, para que se lean unas letras), luego desaparece el contador, y el anillo, el ⌄ y el × no ceden nunca. Las demás pestañas no encogen, y las copias de `.island__measure` tampoco (`width: max-content`), o la medida seguiría al hueco que debe decidir. Trampa: los factores de `flex-shrink` deben sumar más de 1 (nombre 100, contador 1); con 0,01 en el contador flex reduce el espacio a repartir en esa proporción y nada cede.
- En un equipo, tras el "+" va la campanita (`TeamBell`, abajo): lo que hicieron los demás esta semana, con el punto ember del sistema mientras haya algo sin ver. En el espacio personal no está.
- El relleno de la pestaña activa y el del hover son las pastillas de `Liquid`, sin borde: la del hover fluye de una pestaña a otra y la activa aparece en el mismo clic. La casa (`.island__home`) es una pestaña más: misma forma (`--radius-md`) y sin relleno propio, para que su hover y su estado activo sean las mismas pastillas. El tile del espacio (`.island__ws`) y el "+" de proyecto nuevo pasan el ratón con el mismo cristal (`--glass-hover`, y `--glass-on` con su menú abierto), nunca con un relleno sólido. En el menú del espacio, las caras del equipo (`.island__face`) llevan un anillo de 1,5 px del color del propio menú (`--menu-ground`, blanco en Paper) y al pasar el ratón suben con una sombra corta. → [decisión](decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md)
- La pestaña activa lleva ⌄ (renombrar, borrar) y × (cerrar pestaña); el × ocupa el sitio del anillo de progreso. En las demás pestañas abiertas el × sale al pasar el ratón en el sitio del anillo, con su hueco reservado (24 px más 4 de aire) para que su círculo no pise el contador. → [decisión](decisiones/2026-10-07-el-circulo-del-hover-nunca-pisa-el-texto-vecino.md)
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

### Campanita del equipo
`TeamBell` · `components/TeamBell.tsx` · `.island__bell` · `.island__activity`
El icono `bell` del sistema como `IconButton` quiet s (el gemelo del "+" de la Isla) con un globito ember en el hombro (`.island__bell-count`, 14 px, `--on-ember`, "99+" como mucho) que dice cuántas cosas hay sin ver; sin nada nuevo, no hay globito. Abre el Menú del sistema (`.cr-menu`, 300 px) con "Lo que ha hecho el equipo": una fila por hecho de los demás, puesta como el `Comment` del sistema (`.island__event`: el `Avatar` de 20 con la foto de la persona o su inicial en su tono de `toneFor`, la frase en `--fs-small` (13) con el nombre en 600 y el resto apagado, la cita del comentario en `--fs-label` (12) a dos líneas, el proyecto y la hora también en 12 pero en `--text-2`; Eric, 08-10: "cuidao los tamaños de tipo, veo algunas cosas grandes"; un punto ember `.cr-ring-new` al final mientras no se haya visto), de la última semana, las más nuevas arriba, cada una un enlace a la referencia, al proyecto o al sistema. Varias referencias o votos de la misma persona en el mismo proyecto son una fila ("Alberto añadió 4 referencias"). Abrirla marca todo como visto; se pregunta al servidor al llegar y cada minuto con la pestaña visible (`teamActivityFeed`), y cuando la respuesta trae más sin ver que la anterior suena `attention` sutil por `cue` (solo con los sonidos encendidos). Vacío: una frase, no un dibujo. Las mismas líneas van en el resumen diario por correo. → [decisión](decisiones/2026-10-08-avisos-del-equipo-campanita-y-resumen-diario.md)

### Popover
`Popover` · `components/ui/popover.tsx` · `.pp` · `.pp--menu`
Menú flotante de Base UI (posicionador en z 55). Las filas usan `.ws__item`. Es la base de los selectores de proyecto y área, del menú de skills, del menú del fichero y de los menús "…".
- Lo que va dentro de un menú se pinta con los tokens que el menú redefine por tema (`--text`, `--text-2`, `--surface-2`), nunca con `--ink` ni `--disabled`: en Board el menú es oscuro y la tinta del papel desaparece. → [decisión](decisiones/2026-10-07-dentro-de-un-menu-el-texto-usa-los-tokens-del-menu.md)

### Barra lateral
`AppSidebar` · `components/Sidebar.tsx` · `.app-sidebar` · `.nav-item`
Navegación sobre el sidebar de shadcn con los destinos de la Isla y en su orden: Inicio, Descubrir, Inbox, proyectos (anillo, contador y "…") y Nuevo proyecto; al pie Conectores, feedback, cambiar tema y medidor del plan. **Solo se monta en móvil**; en escritorio navega la Isla. ⌘B / Ctrl+B la pliega. → [repite la Isla](decisiones/2026-10-06-el-menu-de-movil-repite-la-isla.md)
- En táctil el "…" de cada proyecto es siempre visible y el contador va a su izquierda; el nombre largo acaba en elipsis antes de los dos.
- Exporta piezas que se usan fuera: `Icons` (iconos de 16 px) y `PlanMeter`.

### Anillo de progreso
`FillRing` · `components/Sidebar.tsx`
Anillo que dice cuánto del sistema de un proyecto está decidido, junto al contador de cada proyecto en la barra lateral.

### Iconos de las áreas
`areaIcon` · `components/area-icons.tsx` · `.area-icon` · muestra: iconos-area
Los 8 conceptos del sistema (tipografía, color, layout, movimiento, iconografía, logo, imagen, voz) con un glifo de Phosphor cada uno, `currentColor`. Donde se nombra un área, su icono va primero.

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
Capa sobre Agentation: píldora "Dar feedback", panel de 3 pasos y "Enviar al equipo". El dock se arrastra y recuerda su sitio. z 100000, siempre encima. `FeedbackEntry` es su entrada al pie de la barra lateral de la biblioteca; en Ajustes, Actividad y esta librería no hay entrada en la columna (se llega por ⌘K) y el dock sigue escondido hasta que hay notas sin enviar. Solo con sesión: en la portada de invitado y en el login no se monta (ahí nadie puede enviar y el globo pisaba el botón de tema de la esquina). La barra de Agentation vive en un shadow root y se maneja desde `components/feedback-mode.ts`; su versión va fija. → [decisión](decisiones/2026-10-06-la-herramienta-de-feedback-va-con-version-fija.md)

### Esqueleto
`.sk` · `app/globals.css` · muestra: skeleton
Brillo que recorre una superficie mientras carga (`shimmer`, 1.6 s). Lo que espera ocupa ya su forma final.

### Relleno líquido de pestañas
`Liquid` · `afterPaint` · `components/ui/liquid.tsx` · `.liquid` · `.liquid__pill`
Envuelve un grupo de pestañas y pinta sus rellenos como dos pastillas: la del hover fluye de pestaña en pestaña siguiendo al puntero; la de la elegida no viaja, salta a la pestaña en el mismo clic, con el texto ya en su color. Lee la elegida del DOM (`aria-selected`, `aria-pressed` o `on`) y acepta `as` (`div`, `nav`, `span`). `afterPaint` lanza lo que abre el clic después de pintar ese fotograma, para las vistas pesadas. Colores por control con `--liquid-on`, `--liquid-hover`, `--liquid-ring`, `--liquid-ink` y `--liquid-ink-off`. Lo usan los controles segmentados, Tablón / Pulido / Sistema y la Isla. → [decisión](decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md)

### Pastilla de la esquina: zoom y música
`ZoomPill` · `components/ZoomPill.tsx` · `.zoom-pill` · `SoundControl` · `components/SoundControl.tsx`
La única pieza que flota abajo a la izquierda, a 16 px de cada pared (como el botón de tema en la esquina contraria), en toda la app con sesión iniciada, la casa incluida; antes de iniciar sesión (portada de invitado, login) no está la pastilla, aunque sí el botón de tema (`.board-zoom` en los tablones y las demás vistas, `.polish__corner` en Pulido, `.shell-corner` fijo en la esquina de la ventana en Ajustes, biblioteca de diseño y actividad, por encima de la columna). Nunca se mueve de su esquina. → [decisión](decisiones/2026-10-06-zoom-y-musica-comparten-la-pastilla-de-la-esquina.md), [Ajustes planos](decisiones/2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md)
- Zoom (− % +): columnas en los tablones, tamaño del tornado en Pulido; las demás vistas no tienen (`zoom={null}`) y la pastilla es el altavoz solo.
- Música, tras una línea fina: el altavoz (`.zoom-pill__sound`) enciende y apaga con un clic; mientras suena, la flecha (`.zoom-pill__track`) abre el menú de la música (`.sound-tracks`, un `cr-menu` de 236) y gira con él: 200 ms al abrir, 150 al cerrar (Eric, 06-10: "que gire acompasado"). Arriba, bajo "Emisora", las tres emisoras con tic (Todas, Lo-fi, Instrumental); bajo la línea, las canciones de la sintonizada en una zona de altura fija que hace scroll (`.sound-tracks__list`, 208 px), con la que suena a la vista. Doce pistas en `public/polish/` (lista `TRACKS`, cada una con su emisora), que no se descargan hasta encenderla; entra y sale con fundido y al acabar una sigue la siguiente de la emisora. → [emisoras](decisiones/2026-10-07-la-musica-se-elige-por-emisora-y-la-lista-no-crece.md), [las pistas](decisiones/2026-10-06-la-musica-de-pulido-se-elige-por-nombre.md)
- Siempre arranca apagada al abrir o recargar la página; solo se recuerda la última canción.
- El audio es uno para toda la página y no se corta al cambiar de pantalla ni de pestaña del navegador (sigue sonando en segundo plano). Suena solo mientras uno de sus botones está en pantalla. Pistas, emisoras, volúmenes y fundidos, en [Sonido](fundamentos/sonido.md).
- En móvil solo Pulido la tiene, arriba bajo la barra.

## Biblioteca y tablero

### Biblioteca
`InspoClient` · `components/InspoClient.tsx` · `.shell` · `.topbar` · `.dock`
La app: barra superior (Isla, logo, acciones), selector Tablón / Pulido / Sistema, el "+" y, abajo, el dock con la barra de reunir, la respuesta del agente y el buscador. Según el espacio activo enruta a Descubrir, Inicio, Inbox, tablero, Pulido o Sistema.
- Atajos: ⌘K paleta, N añadir, "/" buscador (o sobre una tarjeta, entregarla al agente).
- En teléfono el selector de vista conserva los nombres a 12 px y solo la vista activa su cifra; el logo se va cuando hay selector. Entre 801 y 1200 px el selector va solo con iconos para que las pestañas de la Isla conserven sus nombres (hasta el 09-10 era 1100: con cinco pestañas abiertas y equipo, entre 1100 y 1200 el + y la campanita caían bajo el selector).

### Respuesta del agente
`AgentCard` · `components/InspoClient.tsx` · `.dock__agent`
Lo que el agente hizo, con deshacer; sus preguntas con opciones; y lo destructivo pendiente con Hazlo / Déjalo.

### Tablero
`Clouds` · `components/Clouds.tsx` · `.cloud`
Las nubecitas de toda vista que hace scroll bajo las barras: dos bandas del color del fondo (`--bg`, así siguen al tema) en los bordes, degradado en cuatro paradas (100, 82, 36 y 0 por ciento) para que no se vea el filo. Cada una solo donde hay más: la de arriba en cuanto la vista ha hecho scroll (`.is-on`, 220 ms), la de abajo hasta que la vista llega a su final (`.is-off`); con `always` las dos fijas (Pulido). Miden la banda que ocupan las barras (`--fade`: 64 arriba por la Isla, 72 abajo como suelo para la pastilla, 112 con el dock) más una cola de 40 y 32 px. Sin puntero.
- Junto a un scroller absoluto (`mode="sibling"`, el de serie): se pintan justo después de él en el mismo contenedor y pintan por orden del DOM, sin z propio, bajo cualquier barra. Así en el tablón (`Grid`), Descubrir (`.disc-list`, también la de skills), Ejemplos (`.tpls`), Inicio (`.chooser`), los dos inicios vacíos (`EmptyStart`, `ProjectStart`) y Sistema (`.spage`). El scroller es el hermano anterior o el `scroller` que se le pasa; vigila su scroll, su tamaño y sus hijos para saber si queda más.
- Donde la página scrollea con la ventana (`mode="window"`, `SectionShell`: ajustes, librería): cada nube se pega al borde dentro del flujo (`.cloud--sticky`, z 5), la de arriba como primer hijo de la columna con una banda corta (24 + 40, ahí no flota ninguna barra) y la de abajo como último; la columna mide al menos una pantalla y la página crece para que la de abajo llegue siempre al borde.
- No están (todavía) en los paneles con scroll propio: la ficha de referencia, el hilo de comentarios y las hojas.
→ [decisión](decisiones/2026-10-09-el-tablon-se-funde-con-su-fondo-bajo-las-barras.md)

`Grid` · `components/Grid.tsx` · `.board`
Masonry con scroll vertical. El layout son números (ratio de cada tarjeta) y solo se montan las tarjetas cercanas a la pantalla.
- Zoom por columnas: `ZoomPill` (`components/ZoomPill.tsx`, `.zoom-pill`: − % +), colocada por `.board-zoom` en la esquina inferior izquierda, a 16 px de cada pared; pellizco o ⌘/Ctrl+rueda. Abre un paso más lejos que el 100 %. Pulido usa la misma pastilla en la misma esquina.
- La pastilla lleva también la música (`SoundControl`, ver Pastilla de la esquina), en cualquier tablón.
- Nubecitas: las de `Clouds`, con las márgenes del tablón (64 arriba, 112 abajo con dock, 24 sin él). No se montan mientras el tablón está debajo de Pulido, que trae las suyas.
- Las tarjetas se deslizan a su nuevo sitio con una transición CSS de `transform`.
- Cada tarjeta pide la copia de captura que necesita: 288, 720 o 1440 px.

### Tarjeta de referencia
`InspoCard` · `components/InspoCard.tsx` · `.tile`
La miniatura en su forma real: web (og:image o captura), imagen, vídeo en bucle o texto.
- Sin ninguna imagen, la tarjeta es una página de palabras (`.tile__text`, `components/TextRef.css`) en tres formas: un texto (su título y sus primeras líneas), un post de X sin media (`.tile__text--post`: la cara, el nombre y el @handle del autor, y lo que dice, leído de `/api/post` al montarse) y una web sin captura (`.tile__text--site`, 4:3: el dominio, el nombre y la descripción que la página da de sí misma o la nota del equipo). El contenido va arriba y nada se mueve al pasar el ratón. Sin póster con letra gigante ni tinte por dominio. → [decisión](decisiones/2026-10-08-sin-imagen-la-tarjeta-es-una-pagina-de-palabras.md)
- Un vídeo nuestro (fichero subido, grabación de Screen Studio, vídeo o gif de un post de X) hace bucle solo, mudo, mientras la tarjeta está en pantalla (`LoopVideo`, `.tile__loop`), sin triángulo y sin barra de reproducido (Eric, 08-10: "sin barra de progreso los vídeos aquí"). El triángulo (`.tile__play`) solo lo llevan YouTube y Vimeo, que enseñan su fotograma y se ven en la ficha. Con una miniatura elegida a mano, esa imagen manda y la grabación corre solo bajo el puntero. → [decisión](decisiones/2026-10-08-en-el-tablon-todo-video-propio-se-reproduce-solo.md)
- Nota con avatares, chips de etiquetas y estado "reuniendo".
- Abajo a la izquierda, al pasar el ratón (`.tile__go`): tres `IconButton` strong s iguales (el retro: papel, borde ink y bisel), icono solo, la misma talla y el mismo aire (6 px) que los tres de arriba a la derecha, pero en cuadrado redondeado (`--radius-md`, el del `Button`) y no en círculo: carpeta (archivar en proyecto; ember bajo el mismo bisel con `.is-filed` cuando ya está archivada, el único color sobre la imagen), brújula (al sistema) y comentarios. Las palabras (en qué proyectos, cuántos) van en la fila del pie y en cada `label`. Al pasar el ratón, la página hace scroll dentro de la tarjeta. → [decisión](decisiones/2026-10-07-las-dos-filas-de-la-tarjeta-llevan-los-mismos-botones-s-y-la-carpeta-archivada-es-ember.md)
- Arriba a la derecha: Ver URL, los tres puntos (solo la miniatura) y la papelera, que dice de dónde quita la tarjeta. En el tablón de un proyecto dice "Quitar del proyecto", la saca con un clic y la tarjeta vuela a la pestaña Inbox de la Isla como en Pulido (`components/fly-to-inbox.ts`, `.tile-fly`); fuera, "Quitar de" y el nombre del espacio. → [decisión](decisiones/2026-10-06-en-un-proyecto-la-papelera-saca-la-tarjeta-al-inbox.md) Fuera de un proyecto borra: son dos clics seguidos sobre la papelera, que al primero pasa a decir "Borrar" en rojo en el mismo sitio; Esc, sacar el puntero o 6 s lo cancelan. → [decisión](decisiones/2026-10-06-borrar-tarjeta-con-dos-clics-en-la-papelera.md) La papelera solo se pinta para quien puede borrar la referencia: quien la guardó o quien gestiona el espacio (`deletable`). → [decisión](decisiones/2026-10-06-un-miembro-borra-lo-suyo-y-los-admins-el-resto.md)
- Arriba a la izquierda: el círculo de selección (al pasar el ratón o mientras se selecciona) y, tras una búsqueda, el porcentaje de encaje con su porqué. Cuando el círculo aparece, el porcentaje y el chip GIF se apartan 32 px a la derecha. → [decisión](decisiones/2026-10-06-el-estado-de-etiquetado-no-acompana-a-la-busqueda.md)

### Barra de selección
`SelectBar` · `components/SelectBar.tsx` · `.selbar`
Varias referencias a la vez: ⌘ o ⇧-clic en una tarjeta (o su círculo) y la barra ocupa el sitio del dock, sobre el mismo cromo (`--chrome-panel`).
- Cuenta, "Seleccionar todo" (lo que hay en el tablero a la vista; desaparece cuando ya está todo) y Listo.
- Las acciones son `Button` quiet de talla s, con icono de 16; también los selectores de proyecto y Quitar, que no pueden ser `Button` y llevan las clases `cr-btn cr-btn-quiet cr-btn-s`. Listo es el único secundario.
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
- Si lo pegado es un tablero de Are.na, Pinterest o Cosmos (`boardOf`, `lib/boards/match.ts`), el botón pasa a "Importar tablero", se van las otras entradas, la nota y las áreas, y la pista dice qué trae. Al importar, el campo se apaga y debajo sale `BoardProgress` (`components/BoardImport.tsx`, `.board-progress`): el `Progress` de bloques y la línea de lo que pasa ("Leyendo tu tablero de Are.na", "Guardando, 10 de 32"). El diálogo se cierra al terminar y el usuario aterriza en el proyecto del tablero. → [decisión](decisiones/2026-10-08-importar-un-tablero-trae-todo-lo-que-criterio-sabe-guardar.md)
- El modal plano (`DialogContent` con `.modal__header`), no la ventana moss; el guiño retro es el marco de tinta y los botones con bisel. Dentro, el formulario empaquetado: campos de 44 sin pozo (en Board, `--surface-2`), 12 px entre piezas, las otras dos entradas (`.add__pick`) como recuadros discontinuos transparentes y las áreas como pastillas de línea (`.pills--line`: 28 de alto, transparentes, la elegida en cristal). Dos grises en todo el interior (`--add-line`, `--add-quiet`). → [decisión](decisiones/2026-10-07-anadir-es-el-modal-plano-con-el-formulario-empaquetado.md)

### Buscador y barra del agente
`SearchBar` · `components/SearchBar.tsx` · `.sb`
Caja fija abajo, con chips de filtro (persona, fecha, color, sección…) y sugerencias que se abren hacia arriba. Enter o ⌘Enter manda la orden al agente.
- Solo sale sobre un tablón con referencias: un proyecto vacío empieza por su propia caja (`ProjectStart`) y no lleva buscador. → [decisión](decisiones/2026-10-06-el-buscador-solo-sale-sobre-un-tablon-con-referencias.md)
- Muestra la tarjeta marcada con "/" como objetivo.
- Esc en cascada: cierra la lista, vacía, quita chips, quita objetivo, suelta el foco.
- A la derecha, mientras se busca, solo acciones: el botón del agente y la equis. El aviso "Etiquetando N referencias" (trabajo en segundo plano) solo sale con la caja vacía. → [decisión](decisiones/2026-10-06-el-estado-de-etiquetado-no-acompana-a-la-busqueda.md)

### Barra de reunir referencias
`GatherBar` · `components/GatherBar.tsx` · `.gather`
Pegada al dock: recuento, tres miniaturas apiladas, "Añadir" y "Ya tengo mis referencias", que marca el proyecto como empezado y lleva siempre al Sistema (no pasa por Pulido, que es una pestaña aparte). El dock no se ensancha por ella (sigue en 640 px): al texto le quedan unos 160 px junto a las miniaturas y los dos botones, así que los textos son cortos ("El tablón", "7 referencias" y "Sube lo que te inspira." de entradilla) los dos botones siguen en m, a la misma altura (Eric: "cuidado con eso"); "Añadir" lleva menos relleno lateral (10 px) y los huecos de la fila son de 10 px. Si aun así falta sitio, el nombre y la entradilla acaban en puntos suspensivos; el número nunca se recorta. → [decisión](decisiones/2026-10-07-el-dock-no-se-ensancha-por-la-barra-de-reunir.md) En teléfono (≤640 px) es una fila: el título y el botón; miniaturas, recuento, entradilla y "Añadir" fuera (añade el "+" de la barra).

### Pulido
`PolishView` · `components/PolishView.tsx` · `components/PolishView.css` · `.polish`
La fase entre el Tablón y el Sistema (`?view=polish`): lo que queda por decidir del tablón, en un slider con forma de tornado 3D; la tarjeta de delante ocupa más sitio y es la que se decide. → [la fase](decisiones/2026-10-06-vuelve-pulido-como-fase-entre-tablon-y-sistema.md), [cómo se decide](decisiones/2026-10-06-en-pulido-la-tarjeta-decidida-vuela-a-su-pestana.md)
- Niebla arriba y abajo: `Clouds` con `always` (64 y 112 px), las dos siempre encendidas porque las tarjetas giran bajo la Isla y la barra sin scroll; `z-index: 4` en `PolishView.css`, sobre el cielo y bajo la barra.
- La matemática es la del "3D cards tornado" de Osmo Supply, en `requestAnimationFrame` y sin GSAP; sus parámetros son las constantes del principio del fichero. Ventaneado: solo se montan las tarjetas cercanas a la pantalla (unas 33 en un tablero de 134).
- Es un slider manual, siempre: se mueve con la rueda, arrastrando o al decidir, y descansa sobre una tarjeta. Cada vez que se entra, la tarjeta de delante es otra, al azar entre las pendientes (`lastFront`). La de delante es una más del tornado, más grande (`FRONT_W` frente a `CARD_W`) y con las vecinas un poco apartadas (`SPREAD`); en reposo carga su captura grande. Clic en ella abre su ficha, sola: sin flechas ni anterior y siguiente, porque el slider aquí es el tornado (`panelAt` en `InspoClient.tsx`); clic en otra la trae delante. → [decisión](decisiones/2026-10-06-en-pulido-la-ficha-se-abre-sola.md)
- Cada tarjeta enseña la referencia como su ficha (`Face`): una web, una imagen o un vídeo, su captura o fotograma (`Picture`); un texto, su página de palabras con la etiqueta "Texto", el título y las primeras líneas (`.polish__text`); un post de X con foto, vídeo o gif, solo su media a toda la tarjeta (en la de delante el vídeo hace bucle mudo, sin controles ni barra, `LoopVideo`); un post que es solo palabras, la misma caja que la ficha (`PostBox` de `PostView.tsx`: avatar, autor, @usuario, fecha, texto), tan alta como el post hasta 36 em y fundida al pie si se corta (`.polish__post.is-cut`). El post se lee una vez por sesión (`components/post-cache.ts`) y solo lo piden las tarjetas a `POST_NEAR` puestos de la de delante; mientras llega se lee lo que ya dice el nombre. → [decisión](decisiones/2026-10-08-en-pulido-la-tarjeta-se-ve-como-en-la-ficha.md)
- Las respuestas (`.polish__bar`, donde va el dock en el tablón): el pie de la tarjeta de delante (`.polish__now`) y una pieza en dos mitades del mismo peso (`.polish__choice`), **Olvidar** ("Vuelve al Inbox": sale del proyecto, no se borra) y **Conservar** ("Se queda en el tablón"), cada una con la flecha de su tecla. Deshacer aparece al lado cuando hay algo que deshacer. Atajos ← → y ⌘Z.
- El pie no repite lo que ya dice la tarjeta: de una web o una imagen, su nombre (`.polish__name`, hasta dos líneas); de un post o un texto, nada suyo. Debajo (o solo), lo que dijo el equipo (`.polish__say--note`, dos líneas, más apagado): la nota de quien guardó la referencia o, sin nota, el primer comentario, con su avatar (`Avatar`, 18 px) o las caras apiladas si hay más voces en la conversación (`.polish__faces`). Sale de `captionFor` (`InspoCard.tsx`), el mismo dato que el pie de la tarjeta. Una nota larga se corta: dos líneas a la vista y `NOTE_MAX` (280) caracteres en la página; entera se lee en la ficha. Sin nada que decir, el pie no se pinta. Sin IA: es lo que ya estaba escrito. Cuántas le quedan a cada persona lo dice la pestaña Pulido de la barra (`.topbar__fill`, como el 0/8 de Sistema), desde cualquier vista del proyecto; nombre y número comparten línea base (`.topbar__label`). → [decisión](decisiones/2026-10-08-en-pulido-la-tarjeta-se-ve-como-en-la-ficha.md), [la nota y las caras](decisiones/2026-10-06-el-pie-de-pulido-ensena-el-texto-del-post-y-la-nota.md)
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
Caja para nombrar un proyecto nuevo (Enter crea) y la cuadrícula de proyectos, cada uno con su portada (`boardColumns`: el masonry de su tablón en pequeño, con la regla de `layoutBoard` y los mismos `ratioOf`; la miniatura mide la imagen al cargar y se lo dice al tablón) y su anillo indicador. El placeholder rota ejemplos palabra a palabra y respeta reduced-motion. La caja no toma el foco al entrar. → [sin foco al entrar](decisiones/2026-10-07-la-casa-no-enfoca-el-buscador-al-entrar.md)

### Inbox vacío
`InboxZero` · `components/InboxZero.tsx`
Trabajo hecho: un mensaje, los proyectos como portadas (`BoardCard` con el mismo masonry en pequeño que la casa, los más llenos primero) y la misma caja para pegar URL o imagen.

### Proyecto vacío
`ProjectStart` · `components/ProjectStart.tsx`
Caja para pegar enlace o imagen, la frase de intención editable y la biblioteca para traer referencias en bloque.

### Primer arranque
`EmptyStart` · `components/EmptyStart.tsx`
Caja de prompt para pegar una URL y, debajo, un directorio de 9 sitios en pestañas, cada uno con "Añadir".
- La caja también acepta un tablero de Are.na, Pinterest o Cosmos: la pista de debajo (`.boardHint`) dice que trae webs, imágenes, vídeos y textos a un proyecto propio, y al importar sale `BoardProgress` del ancho de la caja (`.board`). Lo importado se pinta de una vez al terminar: si entrara lote a lote, la primera referencia se llevaría el primer arranque y su progreso. Al acabar, el aviso de arriba (`.toast`, sin `--error`, con título y detalle que saltan de línea) dice qué entró por tipo y qué se quedó fuera y por qué. Un tablero pegado sin sesión vuelve del login por `?add=` y se importa igual. → [decisión](decisiones/2026-10-08-importar-un-tablero-trae-todo-lo-que-criterio-sabe-guardar.md)

### Descubrir: ejemplos, recursos y skills
`Discover` · `TemplatesView` · `DiscoverSkills` · `components/Discover.tsx` · `.disc` · `.tplc` · `.disc-skill`
Tres pestañas: Ejemplos (`?in=templates`, antes Plantillas), Recursos (`?in=discover`) y Skills (`?in=skills`). Las tres comparten cabecera, en la columna del contenido y con el patrón de la página de proyecto: el nombre "Descubrir" y la entradilla de la sección (`.disc-head`) y, debajo, una fila (`.disc-bar`) con las pestañas a la izquierda y los controles de la sección a la derecha; la cabecera entera se va con la página al hacer scroll. → [decisión](decisiones/2026-10-06-la-cabecera-de-descubrir-va-en-la-columna-del-contenido.md) Las tres columnas la ponen a la misma altura: cambiar de sección no la mueve. → [decisión](decisiones/2026-10-07-la-cabecera-de-descubrir-no-se-mueve-al-cambiar-de-seccion.md) A la derecha de la fila, en Recursos y en Skills, un campo de búsqueda (`.disc-search`: el pozo s de 34 con la lupa dentro, como el del directorio) que estrecha lo que dejan la estantería y el tipo: cada palabra escrita tiene que estar en el nombre, el dominio, la descripción o el grupo (en Skills: nombre, qué hace, autor o comando), sin acentos ni mayúsculas (`plain` en `lib/directory.ts`); Esc lo vacía. → [decisión](decisiones/2026-10-08-descubrir-lleva-un-buscador-en-recursos-y-skills.md) Recursos agrupados (Todo, Nuevos, Más abiertos; los grupos y las webs salen de `DIRECTORY` en `lib/directory.ts`, su texto de `lib/i18n/<idioma>/directory.ts` y la miniatura de `public/directory/<slug>.jpg`, capturada con `npx tsx --conditions=react-server scripts/directory-shots.ts`; un dominio aparece una sola vez, así que una web ya listada no se repite por tener otra página o un MCP: se amplía su descripción), cada fila con una miniatura del hero de la web que sigue al ratón (`.disc-peek`, seguimiento con requestAnimationFrame y entrada con WAAPI; solo ratón, con reduced-motion solo fundido), y ejemplos: sistemas completos cuya miniatura hace scroll al pasar el ratón; abrir uno enseña su criterio.md y deja crear un proyecto con él. → [se llaman ejemplos](decisiones/2026-10-06-plantillas-se-llaman-ejemplos.md) Las tarjetas de ejemplo enseñan Clonar y Ver al pasar el ratón, con los botones del tablón (`.tile__go-btn`). → [decisión](decisiones/2026-10-06-tarjetas-de-ejemplo-con-clonar-y-ver-al-pasar.md)
- Skills (`components/DiscoverSkills.tsx`) son tarjetas, no filas, y todas son skills de agentes: avatar y autor, nombre (title-s), qué hace y el comando `npx skills add …` en un pozo hundido (`.disc-skill__install`: `--field` y línea `--border`, mono apagado) con Copiar como tecla pequeña en `--surface-2`, sin papel ni `Button`; toda la tarjeta abre su página. → [decisión](decisiones/2026-10-07-el-comando-de-instalar-una-skill-no-es-un-boton-de-papel.md) Agrupadas por tema (`SKILL_TOPICS` en `lib/directory.ts`, con el encabezado `.disc-list__head` de los recursos, un `h2` en title-m → [decisión](decisiones/2026-10-07-los-grupos-de-descubrir-se-titulan-en-title-m.md)), con las pestañas Todo, Recién llegados y Destacados (`FEATURED_SKILLS`) y el menú "Temas" a la derecha de la barra, como en Recursos, y, dentro de cada tema, primero las 13 de criterio.design (`MD_SKILLS` en `lib/md-skill-ids.ts`, nombre y descripción de `t.system.skillsList`, instaladas desde el repo público `criterio-skills` que escribe `scripts/build-skills.ts`) y después las de otros autores (`SKILLS` en `lib/directory.ts`); de estas, las que también están en criterio.md llevan la pastilla "En criterio.md" (`.disc-row__skill`). → [skills en Descubrir](decisiones/2026-10-05-skills-pestana-propia.md), [todas de agentes](decisiones/2026-10-06-todas-las-skills-son-de-agentes.md), [por temas](decisiones/2026-10-06-las-skills-de-descubrir-van-por-temas.md)

### Vídeo en bucle
`LoopVideo` · `components/LoopVideo.tsx`
Grabación corta, muda y en bucle que solo se reproduce mientras está a la vista. Es lo que mueve todo vídeo propio en la tarjeta del tablón. → [decisión](decisiones/2026-10-08-en-el-tablon-todo-video-propio-se-reproduce-solo.md)

## Sistema y marca

### Vista Sistema
`SystemView` · `components/SystemView.tsx` · `.spage`
La página del proyecto. Cabecera en dos líneas: el nombre arriba y, debajo, una sola fila (`.spage-bar`) con las pestañas a la izquierda y las acciones a la derecha, del ancho de la columna del fichero. Tres pestañas: **Markdown** (criterio.md tal cual, la que abre por defecto), **Documento** (el mismo fichero maquetado para leer) y **Presentación** (la marca como guía visual, `BrandPresentation`). → [vuelve la Presentación](decisiones/2026-10-06-vuelve-la-presentacion.md) A la derecha, "Mejorar con IA" como única acción primaria y un menú "…" con traer una marca que ya existe y compartir. Toda la fila va en talla s (pestañas, botones y el "…"), para que no pese más que el nombre (Eric, 07-10: "más pequeños"). → [decisión](decisiones/2026-10-07-la-fila-de-la-pagina-del-proyecto-va-en-s-y-la-barra-del-fichero-es-quiet.md) Se recuerda en el navegador si se estaba en el fichero o en Resultados; el fichero siempre abre como Markdown. Cuando la última lectura dejó referencias fuera (lee 120 como mucho: primero las archivadas en un área y la web del cliente, luego las que tienen notas o comentarios, luego las más recientes), bajo el nombre va una línea en `.spage-muted` (pequeña, `--text-2`): "120 de 154 referencias leídas; las 34 restantes quedaron fuera de esta lectura". Las que quedaron fuera no cuentan como "sin leer". → [cabecera en dos líneas](decisiones/2026-10-06-cabecera-del-proyecto-en-dos-lineas.md) → [resultados en vez de presentación](decisiones/2026-10-05-resultados-en-vez-de-presentacion.md)

### Presentación de marca
`BrandPresentation` · `components/brand/BrandPresentation.tsx` · `components/brand/brand.css`
**Fuera de la vista Sistema desde el 05-10** (sigue en el enlace compartido). La marca como manual: índice a la izquierda y una sección por pantalla, cada una con su número, título grande en la tipografía display de la propia marca y una entradilla. Secciones: introducción, logo, color, tipografía, imagen, movimiento, voz, aplicaciones y recursos (`components/brand/sections/`).
- En la app cada valor se edita donde está; en un enlace compartido es de solo lectura y las secciones vacías no salen.
- Lo que el equipo edita a mano se queda fijo en las pasadas siguientes del modelo hasta que se devuelve.
- Un color que el modelo escribió lejos de todo lo medido (delta E de más de 10 frente a los hex de las referencias, la web del cliente, las guías y las decisiones del equipo) lleva junto al nombre el mismo punto del acento, pero hueco (`.bc-dot--ring`, en la tinta de la baldosa), con el aviso "No sale de lo medido". Solo en la app: el enlace compartido no lo enseña. Editar el color a mano lo quita.

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
- Una tercera fila, **Importar** (icono `Import` de Lucide, sin tic), abre `ImportDialog`. Sitio por defecto, pendiente de Alberto. → [decisión](decisiones/2026-10-08-importar-vive-en-conectores-por-defecto.md)

### Importar
`ImportDialog` · `components/ImportDialog.tsx` · `components/ImportDialog.css` · `.impd`
Se abre desde la fila "Importar" del menú Conectores, ventana como `ConnectDialog`: "Trae lo que ya tenías guardado". Arriba, un tablero de Are.na, Pinterest o Cosmos: campo, botón primario "Importar tablero" y debajo la pista, el error o `BoardProgress`. Corre el mismo flujo que el primer arranque y Añadir (`useBoardImport`, `components/BoardImport.tsx`) y se cierra al terminar, con el usuario en el proyecto del tablero. Debajo, Marcadores: con la extensión conectada (0.7.3 o más), "Importar de X" e "Importar marcadores del navegador" abren su página de importar (`openExtensionImport`, `hooks/use-extension.ts`); si no, el paso que falta (instalar, conectar, actualizar). Una línea avisa del botón "Importar a Criterio" que la extensión pone en los tableros. Plataformas solo con su nombre, sin logos. → [decisión](decisiones/2026-10-08-importar-vive-en-conectores-por-defecto.md)

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
El fichero en un panel de código con el resaltado de un editor, o con aspecto de documento. El panel sigue el tema: oscuro en oscuro, hoja blanca en claro, con sus colores en variables `--md-*`. → [decisión](decisiones/2026-10-06-el-markdown-sigue-el-tema.md) En bruto, los títulos van en dos colores: `#` y `##` en moss (`--md-head`), `###` y más hondos en ember (`--md-head-2`, el ember del tema Paper en claro). → [dos colores de título](decisiones/2026-10-08-el-markdown-en-bruto-lleva-dos-colores-de-titulo.md) Cada bloque se edita en el sitio (guarda al dejar de teclear o con ⌘Enter).
- Aspecto Documento: cada referencia citada es una fila con su captura (144×90) a la izquierda y, en una columna, su nombre, lo que se toma y lo que se dijo. → [decisión](decisiones/2026-10-06-referencias-del-documento-como-cita-con-captura.md)
- Bajo el estado de un área decidida, una línea por señal que la sostiene: "Lo sostiene: Sans geométrica, en 12 de 40 referencias (R1, R4…)". La escribe la app con lo que contó la pasada (`support` del área) y no se edita en el sitio: queda fuera del estado editable, así que nunca se relee como evidencia. Al final de la línea, un `IconButton` quiet xs con el chevron la abre (`.mdv-support`) y lista esas referencias como las cita el fichero; en el aspecto Documento, cada una con su captura. El fichero exportado lleva la línea, sin la lista.
- Aspecto Documento: una tabla de Markdown se pinta como tabla (`.mdv-tr`, `.mdv-td`), con líneas entre filas y sin caja. → [decisión](decisiones/2026-10-06-tablas-del-documento-como-tabla.md)
- Tecla C: modo comentar con pines en el punto exacto; Enter envía el pin.
- Proponer: al activarlo el cursor queda en la primera línea editable a la vista, sin mover el scroll; lo escrito en un área queda como propuesta al salir. No convive con Comentar.
- Barra: Proponer, Comentar, Skills y Copiar. Copiar es un botón partido (`.mdv-split`): la mitad de la flecha abre el menú del fichero. Los botones de la barra son `Button` quiet s sobre el chrome, sin contorno ni papel, con un relleno suave en reposo (`--md-fill`) y más fuerte en hover o activo (`--md-fill-2`), definidos en los tokens del fichero para que valgan en claro y en oscuro. → [cuatro piezas](decisiones/2026-10-06-barra-del-fichero-en-cuatro-piezas.md), [quiet, no papel](decisiones/2026-10-07-la-fila-de-la-pagina-del-proyecto-va-en-s-y-la-barra-del-fichero-es-quiet.md)

### Menú de skills
`SkillsMenu` · `components/SkillsMenu.tsx` · `.sys-skills`
Interruptores (`role=switch`); cada skill añade una sección al criterio.md.

### Menú del fichero
`FileMenu` · `components/FileMenu.tsx`
La flecha junto a Copiar: "Descargar .md" y "Abrir en un chat" (Claude, ChatGPT, Gemini). Abrir va en dos pasos: el primer clic copia el mensaje con el fichero, el segundo abre el chat.

### Mejorar con IA
`ImproveModal` · `components/ImproveModal.tsx` · `.imp`
Antes de la pasada del modelo se elige el objetivo (ordenar, afinar la escritura, releer referencias), las áreas y un texto libre. Pregunta antes de gastar. Es el modal plano con el formulario empaquetado, como Añadir: `.modal__header` con el único título ("Mejorar con IA" en `t-title-s`) y cierre `IconButton` default s, sin barra moss ni segundo encabezado; los objetivos son filas con `Switch`; las áreas, Chips en `.pills--line` que arrancan todas sin elegir (Eric, 08-10: "las áreas de primeras tienen que estar sin seleccionar"; "Todas" las marca de un golpe y hace falta al menos una para lanzar); el campo sin pozo (en Board, `--surface-2`) con el foco en el borde; "Qué puedes esperar" es texto apagado sobre una línea `--border`, no una tarjeta de papel; el pie (Cancelar y Mejorar en s) dentro del formulario. → [decisión](decisiones/2026-10-08-mejorar-con-ia-es-el-modal-plano-sin-barra-ni-tarjeta.md)

### Miniatura de referencia
`Thumb` · `components/Thumb.tsx`
Una referencia en pequeño: su imagen (guardada, póster del vídeo, la de la tarjeta, og:image) o su inicial si no carga. Una grabación de pantalla hace bucle sobre su fotograma.

## Ficha de referencia

### Ficha de referencia
`ItemPanel` · `components/ItemPanel.tsx` · `.ip` · `.cr-viewer`
Hoja sobre el lienzo: favicon, nombre, migas, pestañas Página / Criterio y cerrar; la página a la izquierda y la conversación a la derecha. En el escenario solo se ve la referencia, centrada y del tamaño que tiene (`.ip-card--page` con `align-self: center`); un post o un vídeo se dibujan solos y la tarjeta de alrededor no pinta nada (`:has(> .ip-media)`), el post a 600 px. → [decisión](decisiones/2026-10-08-la-ficha-solo-ensena-la-referencia-centrada.md) Las flechas ← → (y los botones a los lados) recorren el tablero en su orden; abierta desde Pulido es esa referencia sola, sin flechas.
- Las migas: el espacio y, como enlace que abre el original, el dominio de una web (o de la página de donde salió una copia, `source`); de lo que no es una web, lo que abre: "Abrir el tuit" (`card.openPost`), "Abrir el vídeo" o "Abrir la imagen", como el enlace de la propia tarjeta (Eric, 08-10: en un tuit "tiene que ser abrir tuit", no "Abrir la imagen").
- Si un pulido cerrado la sacó de un proyecto, lo dice encima de la conversación (`.cm-notice`, prop `notice` de `CommentsPanel`): "Olvidada en el pulido de Landing Savvia: Eric y Andoni", con "Devolver al tablón", que la devuelve y borra sus votos allí para que se vuelva a votar (`restoreToBoard`). Quitarla del tablón a mano no deja aviso.
- Crece desde el punto del clic (WAAPI, `--ease-out`); al cerrar, 0.96 con fundido de 150 ms. Con reduced-motion, solo fundido. Esc cierra.
- z 30 en escritorio, 60 en móvil. En teléfono las flechas son de 32 px sobre la página, un deslizamiento horizontal pasa de referencia, y un botón de la barra (`.ip-bar__talk`, icono `comment`) baja a la conversación, que va debajo. En ventanas de menos de 500 px de alto la hoja ocupa casi todo. → [móvil](decisiones/2026-10-06-en-movil-cada-vista-cabe-en-la-primera-pantalla.md)

### Vista de página
`PageView` · `components/PageView.tsx` · `.pn`
La captura completa para leer con scroll, o la imagen centrada. Brillo mientras carga. En la ficha, la tarjeta de la página termina donde termina la captura y se centra en el escenario (como toda referencia desde el 08-10): una captura corta no deja una banda oscura debajo; una larga sigue haciendo scroll dentro, con la tarjeta a la altura del escenario como tope. Mientras carga, la tarjeta guarda casi toda la altura para no dar un salto. → [decisión](decisiones/2026-10-08-la-ficha-solo-ensena-la-referencia-centrada.md) Una imagen (`fit`, `.pn.is-fit`) se ve entera, centrada, al tamaño que deja el escenario, y sin tarjeta detrás (fondo transparente y sin borde, como el post y el vídeo): la tarjeta ocupa el ancho del escenario y no puede ajustarse al de la imagen, así que un marco nunca casaría con su proporción. → [decisión](decisiones/2026-10-08-una-imagen-entera-en-la-ficha-no-lleva-tarjeta-detras.md) el escenario (`.ip-stage`) es el contenedor de tamaño contra el que mide su alto (`cqh`), y el visor solo lo es de ancho (`container-type: inline-size`). Trampa: con `container-type: size` el visor no tiene alto propio y, como la tarjeta se ajusta a lo que contiene, la imagen entera se quedaba en una línea de 2 px (08-10, "algunas imágenes no salen en la ficha"); una captura larga no lo sufría porque no va en `is-fit`.

### Vista de post de X
`PostView` · `components/PostView.tsx` · `.pv`
Autor, @usuario, fecha, texto, fotos, vídeo o gif. El vídeo va en un iframe sin Referer (X devuelve 403 si lo lleva) y hace bucle mudo sin controles, como un gif y como en Pulido (Eric, 08-10: "en la ficha que tampoco aparezca el reproductor"). La caja sola es `PostBox` (`post`, `playing`): la misma que pinta la tarjeta de Pulido, con `playing` falso enseña el fotograma del vídeo en vez de reproducirlo. `PostView` la carga desde `components/post-cache.ts` (`usePost`): el post se pide a `/api/post` una vez por sesión para todas las vistas; mientras llega, un shimmer, y si X ya no lo sirve, "no disponible". → [decisión](decisiones/2026-10-08-en-pulido-la-tarjeta-se-ve-como-en-la-ficha.md)

### Página de texto
`TextPage` · `components/TextPage.tsx` · `.ip-text`
La referencia de texto entera, editable en el sitio con autoguardado (también al cerrar).

### Reproductor de vídeo
`VideoPlayer` · `components/VideoPlayer.tsx` · `.vp`
Póster que solo carga el iframe del proveedor al pulsarlo.

### Conversación
`CommentsPanel` · `components/CommentsPanel.tsx` · `.cm`
La columna de la conversación, a la derecha de la ficha de la referencia: la nota original y los hilos, con respuestas a un nivel. Capturas pegadas con ⌘V, arrastradas o con el clip; lightbox con ← → y Esc. Enter envía, Shift+Enter salta línea.
- El texto de todos los comentarios va en `--text`, sea de quien sea (`.cm-msg__body`); el papel apagado es solo del avance de dos líneas bajo la tarjeta (`Comment`). → [decisión](decisiones/2026-10-08-todos-los-comentarios-del-hilo-llevan-el-mismo-color-de-texto.md)
- Vacía, enseña quién la va a leer: bajo la frase y antes de las sugerencias, hasta tres filas fantasma (`.cm-empty__ghosts`) con el `Avatar` real de cada persona a 20 (quien mira primero) y una barra apagada, la segunda fila entrada 24 px, cada una con `pop-in` 90 ms tras la anterior; la frase es una sola y no repite los nombres. → [decisión](decisiones/2026-10-09-el-vacio-de-comentarios-lleva-las-caras-del-equipo.md)

### Criterio de la referencia
`RefCriterio` · `components/RefCriterio.tsx` · `.rfc`
La entrada de la referencia dentro del criterio.md del proyecto, editable, y las áreas que la citan; cada encabezado lleva a ese punto del Sistema.

## Ajustes y admin

### Marco de sección
`SectionShell` · `components/SectionShell.tsx` · `.settings`
El marco de Ajustes, Actividad y esta librería: columna fija con grupos e iconos (siempre abierta en escritorio, sin botón de plegar ni ⌘B; en móvil, una hoja que abre el botón de la barra), migas donde hay (`crumbs`; en Ajustes no, y entonces la barra superior solo existe en móvil y la página empieza en su `h1`), sin entrada de feedback al pie, y contenido a 800 px (1040 con `wide`). → [decisión](decisiones/2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md)
- Nubecitas `Clouds` en modo ventana: la de arriba como primer hijo de la columna (banda corta) y la de abajo como último; la columna mide al menos una pantalla y `.page` crece.


### Encabezado de sección
`SettingsHeading` · `components/SettingsHeading.tsx` · `.settings__heading`
Un `h1` (sin clase: el elemento ya da el tamaño), entradilla en `.t-body` y un aparte opcional a la derecha (selector de periodo, fuente…).

### Paneles de ajustes
`AccountPanel` · `WorkspacePanel` · `MembersPanel` · `ExtensionPanel` · `UsageCard` · `app/settings/_components/`
Cuenta (nombre, foto, tema, idioma), espacio, miembros e invitaciones, claves de la extensión y gasto de IA. Filas `.setting-row` sobre `Card`. Espacio acaba en "Tus espacios": todos los de la persona en filas `.list__row`, con Salir o Eliminar en cada una. → [decisión](decisiones/2026-10-06-los-espacios-se-eligen-en-una-lista-para-salir-o-eliminar.md) En Miembros, el rol de cada persona es un selector (`.list__pick`) para quien gestiona el equipo. → [decisión](decisiones/2026-10-06-un-miembro-borra-lo-suyo-y-los-admins-el-resto.md)

### Panel de actividad
`AdminPanel` · `AreaThumb` · `app/admin/AdminPanel.tsx` · `.ad-kpi`
Cifras, gráficos de columnas en SVG, personas, feedback y accesos. `AreaThumb` dibuja mini interfaces de 40 × 28 por zona de la app. El periodo (7, 30, 90 días) es `PeriodSwitch` (`app/admin/PeriodSwitch.tsx`): `SegmentedControl` de papel en talla s, como todo control de Ajustes, Actividad y `/admin` (Eric, 08-10: "estos tabs tienen que ser más pequeñas"). → [talla s](decisiones/2026-10-07-ajustes-planos-sin-barra-moss-ni-sidebar-plegable.md)

## Públicas

### Portada de invitado
`GuestStart` · `components/GuestStart.tsx` · `.guest__bar`
Barra con logo y Entrar, y el primer arranque debajo. Pegar una URL lleva a login con la URL como destino. La barra lleva solo el logo, sin nombre.

### Acceso
`LoginForm` · `components/LoginForm.tsx` · `.auth`
Enlace mágico, Google, Apple y X, recordando el último método. Al lado, el collage fijo de `public/showcase/`, curado a mano. La página mide lo que la ventana (`.auth:not(.auth--solo)`, `100dvh`): el pie (`.auth__foot`), con la aceptación de Términos y Privacidad (siempre: `legalShown()` ya no oculta nada), se lee sin scroll; si la ventana es más baja que el formulario, hace scroll el panel. → [decisión](decisiones/2026-10-06-el-login-mide-la-ventana-y-su-pie-se-ve-sin-scroll.md)
- El panel sigue el tema (oscuro en Board, papel en Paper), ya no fuerza Paper. El formulario es plano, como antes del sistema: campo y botones sociales de 46 sobre la superficie con línea de 1 px, sin pozo negro ni bisel (`.auth__panel` redefine los tokens de campo y los botones sociales, `.auth__social-btn`); el único bisel es el CTA ember. "Último usado" es una pastilla pequeña de 12 px en `--surface-2`, pegada al final del botón, que no alcanza el texto. Pista a 15, etiqueta y pie a 12. → [decisión](decisiones/2026-10-07-el-login-es-plano-y-enlaza-siempre-a-terminos-y-privacidad.md)

### Documento legal
`LegalDoc` · `components/LegalDoc.tsx` · `.legal`
Las páginas `/privacy` y `/terms`: públicas, con la cabecera de página (`.page__head`: logo, título `.display`, entradilla y fecha de actualización), secciones de texto llano desde `lib/i18n/{en,es}/legal.ts` y, al pie, los enlaces a los otros documentos legales (`.legal__links`), incluida la privacidad de la extensión. Los datos de la sociedad salen de `lib/legal.ts`; mientras falten es un borrador: 404 en producción y un aviso (`.legal__draft`) en desarrollo. → [decisión](decisiones/2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md)

### Invitación
`AcceptInvitation` · `SwitchAccount` · `app/invite/[id]/`
Aceptar la invitación a un equipo; si el correo no coincide, cierra sesión y vuelve al login con la invitación como destino.

### Extensión
`InstallGuide` · `ConnectPanel` · `app/extension/`
Pasos para instalar el zip en `chrome://extensions` y conectar la extensión a un espacio generando su clave.

### Guardar (extensión)
`extension/chrome/popup.html` · `popup.js` · `popup.css` · `.field` · `.select--plain` · `.pill`
El popup: la captura de la pestaña como baldosa, el sitio (favicon, título, host) y el formulario de Añadir con los tokens del cromo: Nota, Proyecto y Áreas del sistema, cada uno con su etiqueta pequeña encima (`.field__label`), el placeholder de la nota de una línea y el proyecto a todo el ancho desde la izquierda. Guardar es el único ember; las áreas son pastillas oscuras y solo la elegida se invierte a papel. → [etiqueta encima del campo](decisiones/2026-10-08-el-formulario-del-popup-lleva-la-etiqueta-encima-del-campo.md), [pastillas oscuras](decisiones/2026-10-08-las-areas-del-popup-son-pastillas-oscuras.md)

### Importar (extensión)
`extension/chrome/import.html` · `import.js` · `import.css` · `.where` · `.dlg`
La pestaña de importar de la extensión, con los tokens del popup. Empieza por la tarjeta "Dónde va": Espacio y Proyecto como dos campos `.select` a la vista y la frase que nombra el destino en negrita (`.where__sum`); sin proyectos, el Inbox. Los botones de importar esperan a que el destino esté cargado. Cada fuente abre una ventana de diálogo (`<dialog>.dlg`: barra moss, título en display, qué entra y dónde en negrita, pie con "Cambiar el destino" e "Importar a Proyecto"), y la vista de progreso repite el destino bajo el título. X y los tableros llevan el campo "Cuáles" (X: los últimos 50 a 500, la última semana, el último mes o todos; un tablero: los primeros 50 a 500 o todo, que es lo que viene marcado). Un tablero no usa el Proyecto elegido: va al proyecto con su nombre, en el Espacio elegido, y su diálogo lo dice; al terminar, la línea separa lo nuevo por tipo, lo que ya estaba en la librería, lo que se quedó fuera y por qué, y lo que falló. → [decisión](decisiones/2026-10-08-importar-dice-el-destino-y-lo-confirma-antes.md)

La extensión misma vive en `extension/chrome` (detalle en `extension/README.md`): el popup, la página de importar y, en los tableros de Are.na, Pinterest y Cosmos cuyo permiso se ha concedido, la píldora "Import to Criterio" (`board-button.js`) abajo a la derecha, en un Shadow DOM cerrado: papel, borde de tinta y bisel, Satoshi, la marca y el anillo ember. Abre la página de importar sobre ese tablero, que lo trae a un proyecto con su nombre y termina diciendo qué entró por tipo y qué se quedó fuera y por qué. → [decisión](decisiones/2026-10-08-la-extension-pone-un-boton-para-importar-un-tablero.md)

### Error y 404
`Lost` · `components/Lost.tsx` · `Lost.css` · `.lost` · lo usan `app/not-found.tsx` y `app/error.tsx`
La cabeza del logotipo flota en el sitio del cero de un "404" grande y tenue (`digits`); en un error va sola y torcida. Debajo, título, una línea de por qué y las salidas como hijos.
- Un solo primario: volver a la librería en la 404, volver a intentarlo en el error (la librería pasa a `Button` secundario).
- Las cifras son decoración (`aria-hidden`, texto al 12 %); el título sigue siendo el `h1`.
- Por encima de 96 px `Logo` usa `icon-512.png` para que la cabeza no se vea blanda.
- `LostTheme` pone el tema al montar: una 404 o un error lanzados desde una página se pintan enteros en el navegador y el script de tema del `<head>` no llega a ejecutarse.
- `app/global-error.tsx` (falla el layout raíz) sigue sin estilos a propósito.
