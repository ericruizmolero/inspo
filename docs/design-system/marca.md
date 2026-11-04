# Marca

Cómo se presenta Criterio en su propia interfaz: Tino como logotipo y favicon, el nombre y los colores que la identifican.

## Logotipo

Tino plano, el mismo dibujo que el favicon, es `Logo` (`components/Logo.tsx`, que pinta `TinoMark`): un SVG en línea en el color del texto (`--text`, y `--chrome-ink` sobre el cromo), blanco en oscuro y tinta en claro, con el visor recortado. Sin baldosa, radio ni sombra propios. Sustituye al nombre en la interfaz; el nombre va en la etiqueta ("criterio.design"). Por decidir si se queda plano o pasa a ser el peluche en 3D (como imagen fija): la librería enseña los dos. La criatura verde ya no sale en ningún sitio. → [decisión](decisiones/2026-11-03-el-logotipo-es-tino-como-el-favicon.md)

| Dónde | Tamaño |
| --- | --- |
| Barra superior de Ajustes, Admin y esta librería | 24 |
| Isla de la biblioteca | 28 |
| Cabecera del login, de las páginas legales y de la extensión | 36 |
| Invitación y autorización del conector | 48 |
| Héroe del login | 88 |
| Página perdida (404) | 128 |

## Favicon e iconos

El favicon no es la criatura sino Tino, el mismo SVG que la landing (`marca/conejo-icono.svg`): de perfil, orejas cortas, sin baldosa, en tinta y en papel con el tema oscuro del sistema. `app/icon.svg`, y en su versión clara `app/favicon.ico` (16 a 64) e `app/icon.png` (256); `app/apple-icon.png` (180) y `public/app-icon-512.png` (el del manifiesto) sobre papel. Los iconos de la extensión de Chrome (`extension/chrome/icons`, 16 a 128, desde la versión 0.7.5) son Tino en tinta sobre una baldosa de papel con las esquinas redondeadas, para que se lea en la barra clara y en la oscura. En Claude, el logo del conector MCP sale del favicon. → [decisión](decisiones/2026-11-03-el-favicon-es-tino-el-mismo-de-la-landing.md)

| Rasgo | Valor |
| --- | --- |
| Forma | Silueta de perfil: dos orejas (la de atrás inclinada −12°), el cuerpo como una gota ancha y el visor, una raya que mira a la derecha |
| Tinta | `#1B1B18` sobre papel `#EDE6D6`; el visor en `#F6F1E6` |
| En oscuro | El SVG se invierte solo (`prefers-color-scheme`): cuerpo `#EDE6D6`, visor `#141412` |
| Trazo | Orejas con contorno de 2,4 y unión redonda; visor de 6,2 con extremos redondos |
| Lienzo | 63 × 63; los PNG llevan fondo de papel, el SVG va transparente |

Dentro de la app, el mismo dibujo es `TinoMark` (`components/TinoMark.tsx`): el SVG en línea, en `currentColor`, con el visor recortado por una máscara, para que siga el tema de la app y no el del sistema. `Logo` lo usa en todos sus sitios. → [decisión](decisiones/2026-11-03-el-logotipo-es-tino-como-el-favicon.md)

## Tino en la librería

Esta página enseña a Tino en dos bloques, cada uno con sus ficheros para descargar:

- **Tino**: el peluche en 3D (`Tino`, `components/Tino.tsx`) con el tema de la página y chips para probar sus gestos. Descarga el modelo de la app (`public/tino/tino-corta.glb`), el dibujo plano sin WebGL (`public/tino/tino-plano.svg`) y el `.blend` con `tino.py` (en la landing). "Manual de Tino" abre el artefacto del equipo con qué está hecha cada parte y dónde se cambia: <https://claude.ai/artifact/DU8qWh2gkV1vWd6GMD8dBM>.
- **Favicon: Tino plano**: `app/icon.svg` leído tal como se sirve, en claro y en oscuro, sus tamaños y su ficha, y cada fichero (SVG, ICO, PNG 256, 180 y 512).

Un fichero nuevo de la marca entra en la lista de descargas de su bloque (`TINO_3D_FILES` o `TINO_FILES` en `components/design-library/Specimens.tsx`) en el mismo trabajo.

## Nombre

El nombre es **criterio.design**, en minúscula. `Wordmark` lo escribe en display 800, tinta sobre papel o papel sobre moss; hoy no se pinta en la interfaz. En texto corrido, "Criterio".

## Colores de marca

| Color | Token | Qué dice |
| --- | --- | --- |
| Papel | `--paper` | El suelo claro, el botón por defecto |
| Tinta | `--ink` | El texto y el borde de todo control |
| Moss | `--moss` | La biblioteca: anillo al día, barra de las ventanas |
| Ember | `--ember` | El único punto cálido: la acción principal |

La marca es la misma en Board y en Paper. → [Color](fundamentos/color.md)

## Reglas

- Donde haga falta la marca, `Logo` con su `size`. Nunca `<img src="/icon.svg">`: sigue el tema del sistema operativo, no el de la app.
- Tino, el peluche de la landing, vive en el Inicio y es la búsqueda del tablón ([Componentes](componentes.md#tino-en-el-inicio), [decisión](decisiones/2026-10-20-tino-entra-en-el-inicio-y-es-la-busqueda-del-tablon.md)). Lo que dice sale de la hoja de copy por estado y va en `t.tino`: solo habla de lo guardado, no se inventa gusto y en un error no bromea.
- El tile de la Isla muestra el espacio, no la mascota. → [decisión](decisiones/2026-10-07-el-tile-de-la-isla-muestra-el-espacio-no-la-mascota.md)
- Nada de "savvia.studio" ni de los nombres anteriores en la interfaz ni en los correos. Los correos salen de `hola@criterio.design` (Resend, dominio verificado), van en texto plano y firman "Eric, Andoni y Alberto" ([decisión](decisiones/2026-10-10-correos-solo-texto.md)), y la imagen al compartir dice solo "criterio.design".
