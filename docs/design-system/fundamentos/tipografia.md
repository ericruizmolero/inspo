# Tipografía

Una familia y ocho pasos. Un solo sitio: el bloque "Type: the one place" de `app/globals.css`; la familia se carga en `app/fonts.ts`. → [decisión](../decisiones/2026-10-07-la-tipografia-vive-en-un-solo-sitio.md)

## Familias

| Familia | Token | Para qué |
| --- | --- | --- |
| Satoshi | `--font-sans` (y `--font-title`, que apunta a ella) | Todo: títulos, texto corrido, interfaz, botones, campos, etiquetas |
| Monoespaciada del sistema | `--font-mono` | Solo datos literales: el fichero crudo, hex, código. Nunca títulos, etiquetas ni "eyebrows" |

Sin segunda fuente. Los títulos tienen su propio token (`--font-title`) para que una segunda familia sea una sola línea. Bricolage Grotesque, Archivo, Inter, Family y Söhne se retiraron. → [Satoshi es la única familia](../decisiones/2026-10-08-satoshi-es-la-unica-familia.md), [sin mono, menos bordes](../decisiones/2026-10-03-sin-mono-menos-bordes.md)

**Los ficheros de Satoshi no están en git.** Su licencia (ITF Free Font License) deja alojarla en nuestra web y meterla en nuestras apps, pero no compartirla en un repositorio público, y este lo es. `scripts/fetch-fonts.mjs` (`npm run fonts`, y solo antes de `dev` y `build`) descarga de Fontshare los ficheros oficiales: las variables normal e itálica para la app, las dos TTF estáticas para la imagen OG y la variable de la extensión. No se recortan ni se convierten, y Satoshi nunca se ofrece como fuente elegible a los usuarios (marca, DESIGN.md, plantillas).

## Escala

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

title-s va por encima de body para que un título nunca se lea más pequeño que el texto de debajo, y display en móvil (32) sigue un paso por encima de title-l (28). → [escala](../decisiones/2026-10-08-archivo-es-la-unica-familia-y-la-escala-se-reajusta.md)

## Reglas

- **El elemento da el nivel.** Un `h1` es igual en todas las vistas, y un `h2` también. Una página tiene un solo `h1`.
- **La clase, solo si el aspecto debe ser otro que el nivel**: un título de diálogo es un `h2` con `.t-title-m`; una etiqueta no es un `h3`, es un `p.t-label`.
- **El CSS de un componente no pone tamaño, peso, interlineado, tracking ni familia en número**: elige un paso o sus tokens (`--fs-*`, `--fw-*`, `--lh-*`, `--tr-*`). Los pesos son cuatro, `--fw-regular` 400, `--fw-medium` 500, `--fw-semibold` 600 y `--fw-bold` 700, y cada paso tiene el suyo (`--fw-body`, `--fw-title-m`…). Nada por encima de 700.
- Tokens fuera de los pasos: `--lh-code` 1,65 para bloques en mono (el fichero crudo, código), `--tr-glyph` −0,04 em para una letra o el wordmark dibujados en grande, y `--fs-badge` 9 px para la cuenta de la campana.
- La extensión (`extension/chrome/popup.css`) copia en su `:root` los tokens de tipo que usa (con `--fs-chrome` 14); se cambian primero en `app/globals.css`.
- Los `text-xs/sm/base/lg` de Tailwind (piezas de shadcn) apuntan a label, ui, ui y body.
- Dos excepciones: el contenido de la marca del usuario en la presentación (`.brand-content`), que lleva su propia tipografía, y las filas de menú (`.cr-menu-item`) a 14 px, entre el 15 de la interfaz y el 13 pequeño. → [decisión](../decisiones/2026-10-07-los-menus-no-llevan-barra-moss.md)
- Los grupos de Descubrir se titulan en title-m. → [decisión](../decisiones/2026-10-07-los-grupos-de-descubrir-se-titulan-en-title-m.md)
