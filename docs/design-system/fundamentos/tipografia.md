# Tipografía

Dos familias y ocho pasos. Un solo sitio: el bloque "Type: the one place" de `app/globals.css`; las familias se cargan en `app/fonts.ts`. → [decisión](../decisiones/2026-10-07-la-tipografia-vive-en-un-solo-sitio.md)

## Familias

| Familia | Token | Para qué |
| --- | --- | --- |
| Bricolage Grotesque | `--font-display` | Titulares y títulos, en 700 y 800. Nunca por debajo de 16 px ni en texto corrido |
| Archivo | `--font-sans` | Todo lo demás: texto corrido, interfaz, botones, campos |
| Monoespaciada del sistema | `--font-mono` | Solo datos literales: el fichero crudo, hex, código. Nunca títulos, etiquetas ni "eyebrows" |

Sin tercera fuente. Inter, Family y Söhne se retiraron. → [sistema Criterio](../decisiones/2026-10-07-sistema-de-diseno-criterio.md), [sin mono, menos bordes](../decisiones/2026-10-03-sin-mono-menos-bordes.md)

## Escala

| Paso | Clase | Fuente | Tamaño / peso / interlineado | Elemento |
| --- | --- | --- | --- | --- |
| display | `.t-display` | Bricolage | 40 (28 en móvil) / 800 / 1, tracking −1 px | `h1` |
| title-l | `.t-title-l` | Bricolage | 28 / 700 / 1,1 | `h2` |
| title-m | `.t-title-m` | Bricolage | 20 / 700 / 1,15 | `h3` |
| title-s | `.t-title-s` | Bricolage | 16 / 700 / 1,2 | `h4` a `h6` |
| body | `.t-body` | Archivo | 17 / 400 / 1,5 | |
| ui | `.t-ui` | Archivo | 15 / 500 / 1,4 | `body` |
| small | `.t-small` | Archivo | 13 / 400 / 1,45 | |
| label | `.t-label` | Archivo | 12 / 500 / 1,3 | |

## Reglas

- **El elemento da el nivel.** Un `h1` es igual en todas las vistas, y un `h2` también. Una página tiene un solo `h1`.
- **La clase, solo si el aspecto debe ser otro que el nivel**: un título de diálogo es un `h2` con `.t-title-m`; una etiqueta no es un `h3`, es un `p.t-label`.
- **El CSS de un componente no pone tamaño, peso, interlineado, tracking ni familia**: elige un paso. Los componentes del sistema (`components/criterio/criterio.css`) usan los tokens `--fs-*`, `--lh-*` y `--tr-*`.
- Los `text-xs/sm/base/lg` de Tailwind (piezas de shadcn) apuntan a label, ui, ui y body.
- Dos excepciones: el contenido de la marca del usuario en la presentación (`.brand-content`), que lleva su propia tipografía, y las filas de menú (`.cr-menu-item`) a 14 px, entre el 15 de la interfaz y el 13 pequeño. → [decisión](../decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)
- Los grupos de Descubrir se titulan en title-m. → [decisión](../decisiones/2026-10-07-los-grupos-de-descubrir-se-titulan-en-title-m.md)
