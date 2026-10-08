# Radios y sombras

Cinco radios, un trazo, tres biseles y dos sombras. Las tarjetas son planas; solo flota la barra de comandos.

## Radios

| Token | Valor | Dónde |
| --- | --- | --- |
| `--radius-sm` | 6 | Cerrar, pistas de progreso, el botón dentro de un campo |
| `--radius-md` | 10 | Botones, campos, pestañas, menús |
| `--radius-lg` | 14 | Tarjetas, globos, barra de pestañas |
| `--radius-xl` | 20 | Paneles hero, barra de comandos, la pregunta de inicio |
| `--radius-pill` | 999 | Chips y pastillas |

Los viejos `--radius-s/m/l` apuntan a sm/md/lg.

## Bordes y bisel

El guiño al 2000: los controles llevan borde de tinta y bisel; campos, casillas y progreso van hundidos. → [sistema Criterio](../decisiones/2026-10-07-sistema-de-diseno-criterio.md)

| Token | Qué es | Dónde |
| --- | --- | --- |
| `--stroke-control` | 1,5 px de `--control-border` (tinta) | Todo control: botones, chips, el modal plano |
| `--bevel` | Luz arriba a la izquierda, sombra abajo a la derecha | Controles en relieve (botón secundario, strong) |
| `--bevel-dark` | El mismo bisel sobre tinta | Botón dark |
| `--bevel-pressed` | Invertido, con `translateY(1px)` | Un control pulsado: se hunde, no encoge |
| `--sunken` | Sombra interior (en Board negra al 60 %, en Paper tinta al 12 %) | Campos, casillas, progreso, el segmentado de papel |

- Las tarjetas son planas: una línea `--border` como mucho, sin bordes discontinuos ni pastillas dentro de cajas. El borde de tinta es solo de los controles. → [sin mono, menos bordes](../decisiones/2026-10-03-sin-mono-menos-bordes.md)
- Los menús (`.cr-menu`) no llevan bisel ni el trazo de 1,5: una línea de 1 px y su sombra. El bisel es de ventanas y botones. → [decisión](../decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)

## Sombras

| Token | Dónde |
| --- | --- |
| `--shadow-card` | `none`: las tarjetas no tienen sombra |
| `--shadow-pop` | Menús y popovers |
| `--shadow-modal` | Diálogos y ventanas |
| `--float` | Solo la barra de comandos |
