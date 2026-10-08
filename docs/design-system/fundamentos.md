# Fundamentos (tokens)

Fuente de verdad: `app/globals.css` (bloque `:root` y `:root[data-theme="light"]`), `app/fonts.ts` y `components/criterio/criterio.css`. Si cambias un valor allí, cámbialo aquí en el mismo commit.

## Origen

Los valores salen del sistema de diseño Criterio (claude.ai/artifact/RM3rCVaxFN4rg8E6XofybK, `tokens.json`). → [decisión](decisiones/2026-10-07-sistema-de-diseno-criterio.md)

## Color

Dos temas: **Board** (oscuro, el suelo del producto) y **Paper** (claro). La paleta de marca y el cromo son iguales en los dos.

| Token | Valor | Uso |
| --- | --- | --- |
| `--paper` | `#EDE6D6` | Papel de marca; botón secundario, suelo del tema claro |
| `--paper-light` | `#F6F1E6` | Tarjetas y paneles sobre papel |
| `--paper-pressed` | `#D9CFBA` | Secundario pulsado |
| `--ink` | `#1B1B18` | Tinta: texto sobre papel, butter y ember; borde de todo control |
| `--board` | `#0F0F0F` | Suelo negro del producto |
| `--board-card` | `#1A1A1A` | Superficies sobre board (el `card` del sistema; `--card` es de shadcn) |
| `--moss` / `--moss-light` / `--moss-dark` | `#4F6B3A` / `#7E9A5C` / `#24301C` | Bibliotecas, anillo al día, éxito |
| `--ember` / `--ember-glow` | `#E8892B` / `#F6A848` | Lo único cálido de la vista: el primario, un punto; foco sobre cromo |
| `--butter` | `#FBF1C7` | Sugerencias y consejos, nada más |
| `--field` / `--field-ink` / `--field-border` / `--field-placeholder` | Board: `#0A0A09` / `--paper` / `#6E695F` / `#8A847A`; Paper: `#FFFFFF` / `--ink` / `--ink` / `#6E695F` | Campos, casillas, interruptores y pistas de progreso: un pozo hundido bajo el suelo. En Board, casi negro con texto papel y borde gris de 1,5 px; en Paper, blanco con una línea suave de 1 px (`#D9D1BF`, `--field-stroke`), no la tinta: "softer". Botones y chips mantienen la tinta. → [campos en Board](decisiones/2026-10-07-los-campos-tienen-version-oscura.md) |
| `--disabled` / `--disabled-text` / `--disabled-border` | `#E2DBCB` / `#6E695F` / `#B9B2A3` | Control desactivado |
| `--danger-deep` | `#B3362C` | Relleno del `Button` danger (confirmar algo que destruye) |
| `--chrome` / `--chrome-panel` / `--chrome-raised` | `#161616` / `#1C1C1C` / `#2A2A2A` (Paper: `--paper-light` / `--paper-light` / `--disabled`) | Cromo del producto; sigue al tema |
| `--chrome-border` | `#262626` (Paper: `#D9D1BF`) | Línea alrededor del cromo |
| `--chrome-ink` | `--paper` (Paper: `--ink`) | Texto fuerte sobre el cromo |
| `--chrome-text` / `--chrome-text-muted` / `--chrome-muted` | `#D8D0C0` / `#B8B1A3` / `#8A847A` (Paper: `#3D3B35` / `#5A5850` / `#6E695F`) | Texto sobre cromo |

Roles que siguen al tema:

| Token | Board | Paper | Uso |
| --- | --- | --- | --- |
| `--bg` (`--surface-page`) | `--board` | `--paper` | Fondo de página |
| `--panel` (`--surface-raised`) | `--board-card` | `--paper-light` | Tarjetas y paneles |
| `--surface` | `--chrome-panel` | `--paper-light` | Popovers, rellenos |
| `--surface-2` | `--chrome-raised` | `--disabled` | Hover, relleno de estado |
| `--glass-hover` / `--glass-on` | `rgba(255,255,255,.08)` / `.14` | `rgba(0,0,0,.045)` / `.07` | Pastillas de hover y activa de la Isla y del selector (con `--glass-blur` y `--glass-line`) |
| `--surface-3` | `#34342F` | `--paper-pressed` | Scrollbar, relleno fuerte |
| `--border` | `#2A2A2A` | `#D9D1BF` | Línea de tarjeta, decorativa |
| `--border-strong` | `#3A3A35` | `--disabled-border` | Separadores fuertes |
| `--text` | `--paper` | `--ink` | Texto principal |
| `--text-2` (`--text-muted`) | `#B8B1A3` | `#5A5850` | Texto secundario (9:1 y 5,6:1) |
| `--muted` / `--muted-2` | `--chrome-muted` / `#6E695F` | `--disabled-text` / `--chrome-muted` | Ayudas, iconos en reposo |
| `--focus` (`--focus-ring`) | `--ember-glow` | `--ink` | Anillo de foco |
| `--danger` / `--success` / `--warning` | `#E5645A` / `--moss-light` / `--ember-glow` | `#B3362C` / `--moss` / `#94640C` | Estados |

Reglas:
- Ember es el primario; lo que era primario no se baja. Butter solo para lo que sugiere la app.
- Nunca colores sueltos para UI: tokens o `color-mix()` con tokens.
- Los alias de shadcn (`--primary` = ember, `--card`, `--sidebar-*`…) apuntan a estos tokens.
- Los `--dock-*` del cromo apuntan a `--chrome*`, que sigue al tema: sin cristal ni desenfoque en barras ni superficies; el cristal (`--glass-*`) es solo de las pastillas de hover y activa de la Isla y del selector. → [el cromo sigue al tema](decisiones/2026-10-07-el-cromo-sigue-al-tema.md), [cromo de arriba](decisiones/2026-10-07-el-cromo-de-arriba-vuelve-a-44-y-sus-pastillas-a-cristal.md)

## Tipografía

Un solo sitio: el bloque "Type: the one place" de `app/globals.css`. Una sola familia, Satoshi (`--font-sans`; los títulos la toman por `--font-title`). Ocho pasos, cada uno con su tamaño (`--fs-*`), peso (`--fw-*`), interlineado (`--lh-*`) y tracking (`--tr-*`). → [decisión](decisiones/2026-10-07-la-tipografia-vive-en-un-solo-sitio.md), [escala](decisiones/2026-10-08-archivo-es-la-unica-familia-y-la-escala-se-reajusta.md), [familia](decisiones/2026-10-08-satoshi-es-la-unica-familia.md)

| Paso | Clase | Tamaño / peso / interlineado / tracking | Elemento |
| --- | --- | --- | --- |
| display | `.t-display` | 40 (32 en móvil) / 700 / 1,05 / −0,025 em | `h1` |
| title-l | `.t-title-l` | 28 / 700 / 1,1 / −0,02 em | `h2` |
| title-m | `.t-title-m` | 22 / 600 / 1,2 / −0,01 em | `h3` |
| title-s | `.t-title-s` | 18 / 600 / 1,3 | `h4` a `h6` |
| body | `.t-body` | 17 / 400 / 1,55 | |
| ui | `.t-ui` | 15 / 500 / 1,4 | `body` |
| small | `.t-small` | 13 / 400 / 1,45 | |
| label | `.t-label` | 12 / 500 / 1,3 | |

Reglas:
- **El elemento da el nivel.** Un `h1` es igual en todas las vistas, y un `h2` también. Una página tiene un solo `h1`.
- **La clase, solo si el aspecto debe ser otro que el nivel**: un título de diálogo es un `h2` con `.t-title-m`; una etiqueta no es un `h3`, es un `p.t-label`.
- **El CSS de un componente no pone tamaño, peso, interlineado, tracking ni familia en número**: elige un paso o sus tokens. Los pesos son cuatro, `--fw-regular` 400, `--fw-medium` 500, `--fw-semibold` 600 y `--fw-bold` 700, y cada paso tiene el suyo (`--fw-body`, `--fw-title-m`…). Nada a 800.
- Dos tokens fuera de los pasos: `--lh-code` 1,65 para bloques en mono (el fichero crudo, código) y `--tr-glyph` −0,04 em para una letra o el wordmark dibujados en grande.
- La extensión (`extension/chrome/popup.css`) copia en su `:root` los tokens de tipo que usa; se cambian primero en `app/globals.css`.
- Los `text-xs/sm/base/lg` de Tailwind (piezas de shadcn) apuntan a label, ui, ui y body.
- Dos excepciones: el contenido de la marca del usuario en la presentación (`.brand-content`), que lleva su propia tipografía, y las filas de menú (`.cr-menu-item`) a 14 px, entre el 15 de la interfaz y el 13 pequeño. → [decisión](decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)
- **Mono**: `--font-mono`, solo datos literales (el fichero crudo, hex, código).

## Controles

Una sola altura: **44**, la del `Button` m. Campos, selects y el `SegmentedControl` de papel (un pozo hundido con borde sutil y la opción elegida como tecla con bisel) miden 44 y se alinean con el botón que llevan al lado. Las barras de herramientas y los menús usan la talla s (34) de forma consistente, también el segmentado de papel (`size="s"`) cuando va en una fila de herramientas dentro de la página. → [decisión](decisiones/2026-10-07-el-segmentado-de-papel-tiene-talla-s-y-un-borde-sutil.md) Un campo de solo lectura o desactivado se ve plano y apagado; el error va debajo del campo (`.cr-field-hint.is-error`).

## Radios

`--radius-sm` 6 (cerrar, pistas) · `--radius-md` 10 (botones, campos, pestañas) · `--radius-lg` 14 (tarjetas, globos, barra de pestañas) · `--radius-xl` 20 (paneles hero, barra de comandos) · `--radius-pill` (chips). Los viejos `--radius-s/m/l` apuntan a sm/md/lg.

## Bordes, bisel y sombras

- `--stroke-control` 1,5 px de `--control-border` (tinta) en todo control.
- `--bevel` (controles en relieve), `--bevel-dark` (controles en tinta), `--bevel-pressed` (pulsado), `--sunken` (campos, casillas, progreso; en Board una sombra negra al 60 %, en Paper tinta al 12 %).
- Los menús (`.cr-menu`) no llevan bisel ni el trazo de 1,5: una línea de 1 px y su sombra. El bisel es de ventanas y botones. Sus filas van a 14 px, la única talla fuera de la escala. → [decisión](decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)
- `--float`: solo la barra de comandos. Las tarjetas son planas (`--shadow-card: none`); `--shadow-pop` y `--shadow-modal` para menús y diálogos.

## Espaciado

`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 · `--space-6` 32 · `--space-7` 48 · `--space-8` 72. Las tarjetas llevan `--space-4`; el hueco del tablero es 10 px. En lo nuevo, solo estos pasos.

## Iconos

Cada icono se pinta con su propio trazo: los del sistema (`Icon`) con trazo 2 sobre 24 px, los de área y sección con 1,5 sobre 16 px. No hay regla global que iguale el grosor: se probó el 07-10 (1,5 px en pantalla para todos) y se retiró el mismo día porque se veían mal ("so ugly"). → [decisión](decisiones/2026-10-07-cada-icono-conserva-su-trazo.md)

## Movimiento

| Token | Valor | Uso |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entradas, hover, casi todo |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Cambios de estado de ida y vuelta |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Cajones y hojas |

- Microinteracciones 0.1–0.15 s; pulsar un control con bisel = `--bevel-pressed` y `translateY(1px)` (se hunde, no encoge).
- Tomar el foco en un campo: 350 ms con `--ease-out`. El anillo está siempre (transparente) y se funde su color, en `.input`, `.cr-input` y `.cr-prompt`. → [decisión](decisiones/2026-10-07-los-campos-toman-el-foco-en-350-ms.md)
- Keyframes disponibles: `fade-in`, `pop-in` (6 px + 0.985), `shimmer` (skeleton), `spin`.
- Cambio de tema hecho a mano: fundido de la página entera en 600 ms con `--ease-in-out` (`switchTheme` en `lib/theme.ts`). → [decisión](decisiones/2026-10-06-boton-de-tema-flotante-en-la-esquina.md)

## Puntos de corte

| Corte | Qué cambia |
| --- | --- |
| `max-width: 800px` | **El corte de la app.** Móvil: la Isla se oculta y aparece el sidebar en hoja; `useIsMobile` corta en 801 |
| `max-width: 560px`, `640px` | Ajustes de piezas en pantallas estrechas |
| `max-width: 900px`, `1100px` | Columnas de páginas anchas (ajustes, sistema); de 801 a 1100 el selector de vista va solo con iconos |
| `prefers-reduced-motion` | Se usa en 23 sitios: quitar movimiento y dejar el fundido |
| `hover: hover` / `hover: none` | Lo que solo aparece al pasar el ratón tiene alternativa táctil, en la misma caja y de una línea (pie de tarjeta, "…" del menú) |
| `max-height: 500px` | Un teléfono tumbado: la ficha ocupa casi todo el alto |

## Capas (z-index)

| z | Qué |
| --- | --- |
| 0–3 | Decoración dentro de tarjetas (badges, botones inferiores, tooltips de tarjeta) |
| 5–6 | Capas dentro de una vista (barras sticky, zonas de soltar, popover de pin) |
| 12 | Pastilla de la esquina (zoom y música) y botón de tema |
| 20 | Barra superior (`.topbar`, Isla) y barra de invitado |
| 25 | Dock (buscador y agente) |
| 30 | Sugerencias del buscador, ficha de referencia (escritorio), selector de referencias |
| 40 | Sidebar flotante |
| 50–55 | Hojas (sheet) y popovers |
| 60 | Ficha de referencia en móvil |
| 80 | Lightbox de comentarios |
| 150 | Avisos (toasts) |
| 200 | Fondo de diálogos y confirmaciones |
| 100000 | Herramienta de feedback, siempre encima |

Regla: una pieza nueva entra en una de estas bandas; no inventar números intermedios.

## Foco

`:focus-visible` con contorno de 2 px en `--focus` (tinta en Paper, `--ember-glow` en Board y sobre cromo), desplazado 2 px. Nunca el azul del navegador.
