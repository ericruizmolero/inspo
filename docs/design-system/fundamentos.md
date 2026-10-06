# Fundamentos (tokens)

Fuente de verdad: `app/globals.css` (bloque `:root` y `:root[data-theme="light"]`) y `app/fonts.ts`. Si cambias un valor allí, cámbialo aquí en el mismo commit.

## Color

Un neutro cálido (un rastro de amarillo) compartido por los dos temas, para que el oscuro no sea más frío que el claro.

| Token | Oscuro | Claro | Uso |
| --- | --- | --- | --- |
| `--bg` | `#0e0e0d` | `#f3f3f0` | Fondo de página |
| `--panel` | `#151514` | `#f9f9f7` | Paneles, tarjetas grandes |
| `--surface` | `#1d1d1b` | `#ffffff` | Botón por defecto, popovers |
| `--surface-2` | `#252523` | `#e8e8e4` | Hover, relleno de estado |
| `--surface-3` | `#2f2f2c` | `#d9d9d4` | Scrollbar, relleno fuerte |
| `--border` | `rgba(255,255,250,.07)` | `rgba(0,0,0,.12)` | Línea casi invisible (usar poco) |
| `--border-strong` | `rgba(255,255,250,.14)` | `rgba(0,0,0,.24)` | Inputs |
| `--text` | `#f2f2ef` | `#0e0e0d` | Texto principal, primario invertido |
| `--text-2` | `#b6b6b1` | `#34342f` | Texto secundario |
| `--muted` | `#8a8a84` | `#5d5d57` | Ayudas, iconos en reposo |
| `--muted-2` | `#6a6a65` | `#76766f` | Lo más apagado |
| `--text-strong` | `#fff` | `#000` | Hover del primario |
| `--danger` / `--success` / `--warning` | `#e5645a` / `#5ac97a` / `#e5b45a` | `#c23a30` / `#267d3f` / `#94640c` | Estados |

Reglas:
- Nunca `#fff`, `#000` ni `rgba(255,255,255,…)` sueltos para UI: tokens o `color-mix(in srgb, var(--text) N%, transparent)`.
- Excepciones a propósito: la tarjeta de recursos del sidebar y los overlays sobre capturas se quedan oscuros en los dos temas.
- Los alias de shadcn (`--primary`, `--card`, `--sidebar-*`…) apuntan a estos tokens; no se les da valor propio.

### Cristal (dock, islas, barras)

Tokens `--dock-*` (en `globals.css`, bloque del dock): `--dock-ink`, `--dock-ink-2`, `--dock-muted`, `--dock-surface`, `--dock-surface-pop`, `--dock-hover`, `--dock-chip`, `--dock-fill`, `--dock-line`, `--dock-danger`, `--dock-shadow`, `--dock-blur`. Oscuro: superficie `rgba(18,18,17,.84)` + `blur(24px) saturate(1.3)`. Claro: `rgba(255,255,255,.72)` + `blur(24px) saturate(1.6)`. Cualquier superficie flotante nueva usa estos, no inventa otro cristal.

## Tipografía

- **Familia única**: Inter variable con eje `opsz` (`app/fonts.ts`, variable `--font-inter`, expuesta como `--font`). El texto pequeño se abre y los títulos se cierran solos.
- **Mono**: `--font-mono` (ui-monospace / SF Mono). Solo datos literales.
- **Base**: `body` 14 px / 1.45, antialiased.
- **Escala en uso** (por frecuencia en el CSS): 11 · 12 · 12.5 · 13 · 13.5 · 14 · 16 · 18 · 20 · 24 · 32 px. Lo normal en UI está entre 12 y 14. No introducir tamaños nuevos sin motivo.
- **Pesos**: 400 cuerpo, 500 UI y botones, 550 etiquetas y títulos pequeños, 600 títulos. Clase `.display`: 600, tracking -0.025em, interlineado 1.1.
- `h1–h3` y `.display` con `text-wrap: balance`; `p` con `text-wrap: pretty`.

## Radios

`--radius-s` 8 px · `--radius-m` 12 px (el `--radius` de shadcn) · `--radius-l` 16 px. Botón 10 px, botón pequeño e icon-button 8 px.

## Sombras

`--shadow-card` (tarjetas), `--shadow-pop` (popovers, menús), `--shadow-modal`, `--shadow-drawer`. En claro son mucho más suaves; nunca poner sombras con valores a mano.

## Movimiento

| Token | Valor | Uso |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entradas, hover, casi todo |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Cambios de estado de ida y vuelta |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Cajones y hojas |

- Microinteracciones 0.1–0.15 s; pulsar = `transform: scale(0.96)`.
- Keyframes disponibles: `fade-in`, `pop-in` (6 px + 0.985), `shimmer` (skeleton), `spin`.
- Cambio de tema hecho a mano: fundido de la página entera en 600 ms con `--ease-in-out` (`switchTheme` en `lib/theme.ts`). → [decisión](decisiones/2026-10-06-boton-de-tema-flotante-en-la-esquina.md)

## Espaciado

No hay una escala cerrada: el CSS creció pieza a pieza. Lo que domina, y lo que hay que usar en lo nuevo:

| Paso | px | Uso típico |
| --- | --- | --- |
| 1 | 2 | Separación entre filas de menú, ajustes ópticos |
| 2 | 4 | Icono y texto muy juntos, chips |
| 3 | 6 | Gap dentro de grupos (pastillas, avatares) |
| 4 | 8 | Gap por defecto entre piezas hermanas |
| 5 | 10 | Gap del tablero, padding de botón pequeño |
| 6 | 12 | Padding de tarjetas y filas, márgenes del tablero |
| 7 | 16 | Padding de paneles, separación entre grupos |
| 8 | 20 / 24 | Separación entre secciones de una página |
| 9 | 32+ | Aire de cabecera de página |

Regla: en lo nuevo, solo valores de esta tabla. Los impares (3, 5, 7, 9) que hay en el código son ajustes ópticos heredados: no copiarlos.

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

`:focus-visible` con contorno de 2 px en `--focus-ring` (el texto al 55 %), desplazado 2 px. Nunca el azul del navegador.
