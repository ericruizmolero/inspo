# Tokens

Los valores del sistema, de dónde salen y dónde vive cada familia. Cada una tiene su página, con la muestra pintada con el CSS real de la app encima de las reglas.

## Fuente de verdad

`app/globals.css` (bloques `:root` y `:root[data-theme="light"]`), `app/fonts.ts` y `components/criterio/criterio.css`; para el sonido, `lib/ui-sounds.ts` y `components/SoundControl.tsx`. Si cambias un valor allí, cámbialo en su página en el mismo commit.

## Origen

Los valores salen del sistema de diseño Criterio (claude.ai/artifact/RM3rCVaxFN4rg8E6XofybK, `tokens.json`). → [decisión](decisiones/2026-10-07-sistema-de-diseno-criterio.md)

## Páginas

| Página | Qué hay |
| --- | --- |
| [Color](fundamentos/color.md) | Paleta de marca, roles que siguen al tema, campos, cromo y estados |
| [Tipografía](fundamentos/tipografia.md) | Las dos familias y la escala de ocho pasos |
| [Espaciado](fundamentos/espaciado.md) | La escala de espacio y la altura única de los controles |
| [Radios y sombras](fundamentos/radios-y-sombras.md) | Radios, bordes, bisel y las pocas sombras |
| [Movimiento](fundamentos/movimiento.md) | Curvas, duraciones y keyframes |
| [Sonido](fundamentos/sonido.md) | Los catorce sonidos de la interfaz y la música: material, dónde suena cada uno y cómo se enciende |
| [Iconos](fundamentos/iconos.md) | Los tres juegos de iconos y su trazo |
| [Pantalla, capas y foco](fundamentos/pantalla.md) | Puntos de corte, z-index y el anillo de foco |

## Reglas que cruzan todas las páginas

- Nunca valores sueltos para UI: tokens o `color-mix()` con tokens. Un valor nuevo entra en `globals.css` y en su página, nunca en el CSS de un componente.
- Los alias de shadcn (`--primary` = ember, `--card`, `--sidebar-*`…) y los nombres viejos (`--bg`, `--panel`, `--surface*`, `--text-2`, `--dock-*`) apuntan a los tokens del sistema. Lo nuevo usa los nombres del sistema; los alias se retiran cuando no quede CSS que los lea.
- Dos temas, Board (oscuro) y Paper (claro), desde los mismos tokens. Lo que se diseña se mira en los dos.
