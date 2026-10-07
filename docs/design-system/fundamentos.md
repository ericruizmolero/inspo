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
| `--field` / `--field-ink` / `--field-border` / `--field-placeholder` | Board: `#0A0A09` / `--paper` / `#6E695F` / `#8A847A`; Paper: `#FFFFFF` / `--ink` / `--ink` / `#6E695F` | Campos, casillas, interruptores y pistas de progreso: un pozo hundido bajo el suelo. En Board, casi negro con texto papel y borde gris de 1,5 px; en Paper, blanco con una línea suave de 1 px (`#D9D1BF`, `--field-stroke`), no la tinta: "softer". Botones y chips mantienen la tinta. La ventana modal (`DialogWindow`) los lleva siempre en Paper |
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
- Los `--dock-*` del cromo apuntan a `--chrome*`, que sigue al tema: sin cristal ni desenfoque.

## Tipografía

Un solo sitio: el bloque "Type: the one place" de `app/globals.css`. Ocho pasos, cada uno con su tamaño, peso, interlineado y tracking:

| Paso | Clase | Fuente | Tamaño / peso / interlineado | Elemento |
| --- | --- | --- | --- | --- |
| display | `.t-display` | Bricolage | 40 (28 en móvil) / 800 / 1, −1 px | `h1` |
| title-l | `.t-title-l` | Bricolage | 28 / 700 / 1,1 | `h2` |
| title-m | `.t-title-m` | Bricolage | 20 / 700 / 1,15 | `h3` |
| title-s | `.t-title-s` | Bricolage | 16 / 700 / 1,2 | `h4` a `h6` |
| body | `.t-body` | Archivo | 17 / 400 / 1,5 | |
| ui | `.t-ui` | Archivo | 15 / 500 / 1,4 | `body` |
| small | `.t-small` | Archivo | 13 / 400 / 1,45 | |
| label | `.t-label` | Archivo | 12 / 500 / 1,3 | |

Reglas:
- **El elemento da el nivel.** Un `h1` es igual en todas las vistas, y un `h2` también. Una página tiene un solo `h1`.
- **La clase, solo si el aspecto debe ser otro que el nivel**: un título de diálogo es un `h2` con `.t-title-m`; una etiqueta no es un `h3`, es un `p.t-label`.
- **El CSS de un componente no pone tamaño, peso, interlineado, tracking ni familia**: elige un paso. Los componentes del sistema (`components/criterio/criterio.css`) usan los tokens `--fs-*`, `--lh-*` y `--tr-*`.
- Los `text-xs/sm/base/lg` de Tailwind (piezas de shadcn) apuntan a label, ui, ui y body.
- La única excepción es el contenido de la marca del usuario en la presentación (`.brand-content`), que lleva su propia tipografía.
- **Mono**: `--font-mono`, solo datos literales (el fichero crudo, hex, código).

## Controles

Una sola altura: **44**, la del `Button` m. Campos, selects y el `SegmentedControl` de papel (un pozo hundido con la opción elegida como tecla con bisel) miden 44 y se alinean con el botón que llevan al lado. Las barras de herramientas y los menús usan la talla s (34) de forma consistente. Un campo de solo lectura o desactivado se ve plano y apagado; el error va debajo del campo (`.cr-field-hint.is-error`).

## Radios

`--radius-sm` 6 (cerrar, pistas) · `--radius-md` 10 (botones, campos, pestañas) · `--radius-lg` 14 (tarjetas, globos, barra de pestañas) · `--radius-xl` 20 (paneles hero, barra de comandos) · `--radius-pill` (chips). Los viejos `--radius-s/m/l` apuntan a sm/md/lg.

## Bordes, bisel y sombras

- `--stroke-control` 1,5 px de `--control-border` (tinta) en todo control.
- `--bevel` (controles en relieve), `--bevel-dark` (controles en tinta), `--bevel-pressed` (pulsado), `--sunken` (campos, casillas, progreso; en Board una sombra negra al 60 %, en Paper tinta al 12 %).
- `--float`: solo la barra de comandos. Las tarjetas son planas (`--shadow-card: none`); `--shadow-pop` y `--shadow-modal` para menús y diálogos.

## Espaciado

`--space-1` 4 · `--space-2` 8 · `--space-3` 12 · `--space-4` 16 · `--space-5` 24 · `--space-6` 32 · `--space-7` 48 · `--space-8` 72. Las tarjetas llevan `--space-4`; el hueco del tablero es 10 px. En lo nuevo, solo estos pasos.

## Iconos

Cada icono se pinta con su propio trazo: los del sistema (`Icon`) con trazo 2 sobre 24 px, los de área y sección con 1,5 sobre 16 px. No hay regla global que iguale el grosor: se probó el 07-10 (1,5 px en pantalla para todos) y se retiró el mismo día porque se veían mal ("so ugly").

## Movimiento

| Token | Valor | Uso |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entradas, hover, casi todo |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Cambios de estado de ida y vuelta |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Cajones y hojas |

- Microinteracciones 0.1–0.15 s; pulsar un control con bisel = `--bevel-pressed` y `translateY(1px)` (se hunde, no encoge).
- Keyframes disponibles: `fade-in`, `pop-in` (6 px + 0.985), `shimmer` (skeleton), `spin`.

## Puntos de corte

| Corte | Qué cambia |
| --- | --- |
| `max-width: 800px` | **El corte de la app.** Móvil: la Isla se oculta y aparece el sidebar en hoja; `useIsMobile` corta en 801 |
| `max-width: 560px`, `640px` | Ajustes de piezas en pantallas estrechas |
| `max-width: 900px`, `1100px` | Columnas de páginas anchas (ajustes, sistema) |
| `prefers-reduced-motion` | Se usa en 23 sitios: quitar movimiento y dejar el fundido |
| `hover: hover` / `hover: none` | Lo que solo aparece al pasar el ratón tiene alternativa táctil |

## Capas (z-index)

| z | Qué |
| --- | --- |
| 0–3 | Decoración dentro de tarjetas (badges, botones inferiores, tooltips de tarjeta) |
| 5–6 | Capas dentro de una vista (barras sticky, zonas de soltar, popover de pin) |
| 12 | Control de zoom del tablero |
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
