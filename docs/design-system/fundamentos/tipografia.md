# Tipografía

Dos familias y ocho pasos. Un solo sitio: el bloque "Type: the one place" de `app/globals.css`; las familias se cargan en `app/fonts.ts`. → [decisión](../decisiones/2026-10-07-la-tipografia-vive-en-un-solo-sitio.md)

## Familias

| Familia | Token | Para qué |
| --- | --- | --- |
| Geist Serif | `--font-title` | Los títulos grandes: hero, display y title-l (`h1`, `h2`) |
| Geist | `--font-sans` | Todo lo demás: los títulos medianos y pequeños (title-m, title-s, `h3` a `h6`: tarjetas, listas, paneles, Tino), texto corrido, interfaz, botones, campos, etiquetas |
| Monoespaciada del sistema | `--font-mono` | Solo datos literales: el fichero crudo, hex, código. Nunca títulos, etiquetas ni "eyebrows" |

Los títulos van en Geist Serif desde el 04-11, en su único peso (400), con `font-synthesis-weight: none` para que el navegador nunca invente una negrita; la jerarquía la da el tamaño. → [decisión](../decisiones/2026-11-04-los-titulos-van-en-geist-serif.md) Bricolage Grotesque, Archivo, Inter, Family, Söhne y Satoshi se retiraron. → [Geist es la única familia](../decisiones/2026-11-03-geist-es-la-unica-familia.md), [sin mono, menos bordes](../decisiones/2026-10-03-sin-mono-menos-bordes.md)

**Los ficheros de Geist y Geist Serif están en git.** Su licencia (SIL Open Font License 1.1) lo permite. `app/fonts/geist/` guarda las variables normal e itálica para la app y las dos TTF estáticas para la imagen OG; la extensión y la web de marketing llevan su copia de la variable. `app/fonts/geist-serif/` guarda `GeistSerif-Regular.woff2`. Cada carpeta tiene su `OFL.txt`.

## Escala

| Paso | Clase | Tamaño / peso / interlineado / tracking | Elemento |
| --- | --- | --- | --- |
| hero | `--fs-hero` | clamp(38, 5vw, 56) / 400 / 0,96 / −0,025 em | los titulares de portada: `.cr-hello` (el inicio) y el arranque sin sesión |
| display | `.t-display` | 40 (32 en móvil) / 400 / 0,96 / −0,025 em | `h1` |
| title-l | `.t-title-l` | 28 / 400 / 1,1 / −0,02 em | `h2` |
| title-m | `.t-title-m` | 22 / 600 / 1,2 / −0,01 em | `h3` |
| title-s | `.t-title-s` | 18 / 600 / 1,3 | `h4` a `h6` |
| body | `.t-body` | 17 / 400 / 1,55 | |
| ui | `.t-ui` | 15 / 500 / 1,4 | `body` |
| small | `.t-small` | 13 / 400 / 1,45 | |
| label | `.t-label` | 12 / 500 / 1,3 | |

La referencia de la tipografía es Design Zeitgeist: la serif en regular, grande y apretada (interlineado 0,96), y debajo una sans pequeña y gris. Un nombre en un comentario va en medium (500), no en semibold. La serif solo va en los títulos grandes; en una tarjeta, una lista, un panel o un globo de Tino, un título pequeño en serif estorba (Eric, 04-11). title-s va por encima de body para que un título nunca se lea más pequeño que el texto de debajo, y display en móvil (32) sigue un paso por encima de title-l (28). → [escala](../decisiones/2026-10-08-archivo-es-la-unica-familia-y-la-escala-se-reajusta.md)

## Reglas

- **El elemento da el nivel.** Un `h1` es igual en todas las vistas, y un `h2` también. Una página tiene un solo `h1`.
- **La clase, solo si el aspecto debe ser otro que el nivel**: un título de diálogo es un `h2` con `.t-title-m`; una etiqueta no es un `h3`, es un `p.t-label`.
- **El CSS de un componente no pone tamaño, peso, interlineado, tracking ni familia en número**: elige un paso o sus tokens (`--fs-*`, `--fw-*`, `--lh-*`, `--tr-*`). Los pesos son cuatro, `--fw-regular` 400, `--fw-medium` 500, `--fw-semibold` 600 y `--fw-bold` 700, y cada paso tiene el suyo (`--fw-body`, `--fw-title-m`…). Nada por encima de 700.
- Tokens fuera de los pasos: `--lh-code` 1,65 para bloques en mono (el fichero crudo, código), `--tr-glyph` −0,04 em para una letra o el wordmark dibujados en grande, y `--fs-badge` 9 px para la cuenta de la campana.
- La extensión (`extension/chrome/popup.css`) copia en su `:root` los tokens de tipo que usa (con `--fs-chrome` 14); se cambian primero en `app/globals.css`.
- Los `text-xs/sm/base/lg` de Tailwind (piezas de shadcn) apuntan a label, ui, ui y body.
- Dos excepciones: el contenido de la marca del usuario en la presentación (`.brand-content`), que lleva su propia tipografía, y las filas de menú (`.cr-menu-item`) a 14 px, entre el 15 de la interfaz y el 13 pequeño. → [decisión](../decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)
- Los grupos de Descubrir se titulan en title-m. → [decisión](../decisiones/2026-10-07-los-grupos-de-descubrir-se-titulan-en-title-m.md)
