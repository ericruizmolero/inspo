# Color

Dos temas: **Board** (oscuro, el suelo del producto) y **Paper** (claro). La paleta de marca y el cromo son iguales en los dos; los roles cambian con el tema.

## Marca

| Token | Valor | Uso |
| --- | --- | --- |
| `--paper` | `#EDE6D6` | Papel de marca; botón secundario y suelo de ventanas, menús y tips |
| `--paper-light` | `#F6F1E6` | Hover del secundario; tarjetas dentro de una ventana |
| `--paper-white` | `#FCFAF6` | Suelo del tema Paper; encima, tarjetas, paneles y cromo en blanco puro |
| `--paper-pressed` | `#D9CFBA` | Secundario pulsado |
| `--ink` | `#1B1B18` | Tinta: texto sobre papel, butter y ember; borde de todo control |
| `--board` | `#0F0F0F` | Suelo negro del producto |
| `--board-card` | `#1A1A1A` | Superficies sobre board (el `card` del sistema; `--card` es de shadcn) |
| `--moss` / `--moss-light` / `--moss-dark` | `#4F6B3A` / `#7E9A5C` / `#24301C` | Bibliotecas, anillo al día, éxito |
| `--ember` / `--ember-glow` | `#E8892B` / `#F6A848` | Lo único cálido de la vista: el primario, un punto; foco sobre cromo |
| `--butter` | `#FBF1C7` | Sugerencias y consejos, nada más |

## Controles

| Token | Valor | Uso |
| --- | --- | --- |
| `--field` / `--field-ink` / `--field-border` / `--field-placeholder` | Board: `#0A0A09` / `--paper` / `#6E695F` / `#8A847A`; Paper: `#FFFFFF` / `--ink` / `--ink` / `#6E695F` | Campos, casillas, interruptores y pistas de progreso: un pozo hundido bajo el suelo. En Board, casi negro con texto papel y borde gris de 1,5 px; en Paper, blanco con una línea suave de 1 px (`#D9D1BF`, `--field-stroke`), no la tinta. Botones y chips mantienen la tinta. → [campos en Board](../decisiones/2026-10-07-los-campos-tienen-version-oscura.md) |
| `--disabled` / `--disabled-text` / `--disabled-border` | `#E2DBCB` / `#6E695F` / `#B9B2A3` | Control desactivado |
| `--danger-deep` | `#B3362C` | Relleno del `Button` danger (confirmar algo que destruye) |

## Cromo

| Token | Board | Paper | Uso |
| --- | --- | --- | --- |
| `--chrome` / `--chrome-panel` / `--chrome-raised` | `#161616` / `#1C1C1C` / `#2A2A2A` | `#FFFFFF` / `#FFFFFF` / `--disabled` | Cromo del producto (Isla, selector de vista, zoom, dock, ficha); sigue al tema |
| `--chrome-border` | `#262626` | `#D9D1BF` | Línea alrededor del cromo |
| `--chrome-ink` | `--paper` | `--ink` | Texto fuerte sobre el cromo |
| `--chrome-text` / `--chrome-text-muted` / `--chrome-muted` | `#D8D0C0` / `#B8B1A3` / `#8A847A` | `#3D3B35` / `#5A5850` / `#6E695F` | Texto sobre cromo |
| `--glass-hover` / `--glass-on` | `rgba(255,255,255,.08)` / `.14` | `rgba(0,0,0,.045)` / `.07` | Pastillas de hover y activa de la Isla y del selector (con `--glass-blur` y `--glass-line`) |

El cromo es sólido: sin cristal ni desenfoque en barras ni superficies. El cristal (`--glass-*`) es solo de las pastillas de hover y activa de la Isla y del selector. Los `--dock-*` viejos apuntan a `--chrome*`. → [el cromo sigue al tema](../decisiones/2026-10-07-el-cromo-sigue-al-tema.md), [cromo de arriba](../decisiones/2026-10-07-el-cromo-de-arriba-vuelve-a-44-y-sus-pastillas-a-cristal.md)

## Roles que siguen al tema

| Token | Board | Paper | Uso |
| --- | --- | --- | --- |
| `--bg` (`--surface-page`) | `--board` | `--paper-white` | Fondo de página. En Paper, el papel de marca quedaba pastel; el suelo es casi blanco y lo que va encima, blanco → [decisión](../decisiones/2026-10-07-el-suelo-del-tema-paper-es-mas-blanco-que-el-papel-de-marca.md) |
| `--panel` (`--surface-raised`) | `--board-card` | `#FFFFFF` | Tarjetas y paneles |
| `--surface` | `--chrome-panel` | `#FFFFFF` | Popovers, rellenos |
| `--surface-2` | `--chrome-raised` | `--disabled` | Hover, relleno de estado |
| `--surface-3` | `#34342F` | `--paper-pressed` | Scrollbar, relleno fuerte |
| `--border` | `#2A2A2A` | `#D9D1BF` | Línea de tarjeta, decorativa |
| `--border-strong` | `#3A3A35` | `--disabled-border` | Separadores fuertes |
| `--text` | `--paper` | `--ink` | Texto principal |
| `--text-2` (`--text-muted`) | `#B8B1A3` | `#5A5850` | Texto secundario (9:1 y 5,6:1) |
| `--muted` / `--muted-2` | `--chrome-muted` / `#6E695F` | `--disabled-text` / `--chrome-muted` | Ayudas, iconos en reposo |
| `--focus` (`--focus-ring`) | `--ember-glow` | `--ink` | Anillo de foco |
| `--danger` / `--success` / `--warning` | `#E5645A` / `--moss-light` / `--ember-glow` | `#B3362C` / `--moss` / `#94640C` | Estados |

## Reglas

- **Ember es el primario** y lo que era primario no se baja. Un punto cálido por vista. → [lo que era primario](../decisiones/2026-10-07-lo-que-era-primario-sigue-siendo-primario.md)
- **Butter solo para lo que sugiere la app**: globos, consejos, tooltips.
- **Moss es la biblioteca**: anillo al día, éxito, barra de las ventanas. → [ventanas](../decisiones/2026-10-07-toda-ventana-lleva-barra-moss-y-sigue-al-tema.md)
- Nunca colores sueltos para UI: tokens o `color-mix()` con tokens. Nunca `#fff` ni `rgba(255,255,255,…)`. → [tema claro/oscuro](../decisiones/2026-09-21-tema-claro-oscuro.md)
- Fondo liso `--bg` en todas las vistas: sin tramas ni texturas. → [fondo liso](../decisiones/2026-10-05-fondo-liso-sin-puntos.md)
- Los alias de shadcn (`--primary` = ember, `--card`, `--sidebar-*`…) apuntan a estos tokens.
