# Pantalla, capas y foco

Dónde corta la app, en qué orden se apilan las cosas y cómo se ve el foco.

## Puntos de corte

| Corte | Qué cambia |
| --- | --- |
| `max-width: 800px` | **El corte de la app.** Móvil: la Isla se oculta y aparece el sidebar en hoja; `useIsMobile` corta en 801 |
| `max-width: 560px`, `640px` | Ajustes de piezas en pantallas estrechas; el display baja a 28 |
| `max-width: 900px`, `1100px` | Columnas de páginas anchas (ajustes, sistema); de 801 a 1100 el selector de vista va solo con iconos |
| `prefers-reduced-motion` | Quitar movimiento y dejar el fundido |
| `hover: hover` / `hover: none` | Lo que solo aparece al pasar el ratón tiene alternativa táctil, en la misma caja y de una línea (pie de tarjeta, "…" del menú) |
| `max-height: 500px` | Un teléfono tumbado: la ficha ocupa casi todo el alto |

El móvil hereda el escritorio vista por vista: el menú de móvil repite la Isla y cada vista cabe en la primera pantalla. → [el menú de móvil](../decisiones/2026-10-06-el-menu-de-movil-repite-la-isla.md), [primera pantalla](../decisiones/2026-10-06-en-movil-cada-vista-cabe-en-la-primera-pantalla.md)

## Capas (z-index)

| z | Qué |
| --- | --- |
| 0 a 3 | Decoración dentro de tarjetas (badges, botones inferiores, tooltips de tarjeta) |
| 5 a 6 | Capas dentro de una vista (barras sticky, zonas de soltar, popover de pin) |
| 12 | Pastilla de la esquina (zoom y música) y botón de tema |
| 20 | Barra superior (`.topbar`, Isla) y barra de invitado |
| 25 | Dock (buscador y agente) |
| 30 | Sugerencias del buscador, ficha de referencia (escritorio), selector de referencias |
| 40 | Sidebar flotante |
| 50 a 55 | Hojas (sheet) y popovers |
| 60 | Ficha de referencia en móvil |
| 80 | Lightbox de comentarios |
| 150 | Avisos (toasts) |
| 200 | Fondo de diálogos y confirmaciones |
| 100000 | Herramienta de feedback, siempre encima |

Regla: una pieza nueva entra en una de estas bandas; no inventar números intermedios.

## Foco

`:focus-visible` con contorno de 2 px en `--focus` (tinta en Paper, `--ember-glow` en Board y sobre cromo), desplazado 2 px. Nunca el azul del navegador. En los campos el anillo está siempre y se funde su color en 350 ms. → [decisión](../decisiones/2026-10-07-los-campos-toman-el-foco-en-350-ms.md)
