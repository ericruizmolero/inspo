# Movimiento

"Fluidez de Apple": arranque instantáneo, todo se mueve en bloque y al unísono, sin tirones. Si va a tirones en Safari, está mal aunque se vea bien en una captura. → [cortina](../decisiones/2026-09-24-cortina-sidebar-waapi.md), [masonry ventanada](../decisiones/2026-10-01-masonry-ventanada-sin-flip.md)

## Curvas

| Token | Valor | Uso |
| --- | --- | --- |
| `--ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | Entradas, hover, casi todo |
| `--ease-in-out` | `cubic-bezier(0.77, 0, 0.175, 1)` | Cambios de estado de ida y vuelta |
| `--ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | Cajones y hojas |

## Duraciones

| Qué | Cuánto |
| --- | --- |
| Microinteracciones (hover, pulsar) | 0,1 a 0,15 s |
| Pulsar un control con bisel | `--bevel-pressed` y `translateY(1px)`: se hunde, no encoge |
| Tomar el foco en un campo | 350 ms con `--ease-out`; el anillo está siempre (transparente) y se funde su color, en `.input`, `.cr-input` y `.cr-prompt` → [decisión](../decisiones/2026-10-07-los-campos-toman-el-foco-en-350-ms.md) |
| Cambio de tema | Fundido de la página entera en 600 ms con `--ease-in-out` (`switchTheme` en `lib/theme.ts`) → [decisión](../decisiones/2026-10-06-boton-de-tema-flotante-en-la-esquina.md) |
| Relleno de pestañas y segmentados | Líquido: la pastilla fluye de opción en opción (`components/ui/liquid.tsx`) → [decisión](../decisiones/2026-10-06-el-relleno-de-las-pestanas-es-liquido.md) |

## Keyframes

`fade-in`, `pop-in` (6 px y escala 0.985), `shimmer` (skeleton) y `spin`. Nada más: una animación nueva se añade aquí o no existe.

## Reglas

- `prefers-reduced-motion` se respeta en todas partes: quitar el movimiento y dejar el fundido.
- Sin GSAP: lo que se mueve va con transiciones CSS o con la Web Animations API, y se mide antes de animar. → [miniatura sin GSAP](../decisiones/2026-10-05-miniatura-descubrir-sin-gsap.md)
- Un morph de caja o vuelos sueltos no valen: lo que cambia junto se mueve junto.
