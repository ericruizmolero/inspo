# Marca

Cómo se presenta Criterio en su propia interfaz: la criatura como logotipo, el nombre y los tres colores que la identifican.

## Logotipo

La criatura en 3D (verde, antenas naranjas, tres ojos) es `Logo` (`components/Logo.tsx`): un dibujo transparente, sin baldosa, radio ni sombra propios. `public/logo.png` hasta 96 px y `public/icon-512.png` por encima. Sustituye al nombre en la interfaz; el nombre va en el `alt` ("criterio.design"). El resto del personaje (estados, `Sprite`, la o con ojos del wordmark) sigue fuera. → [decisión](decisiones/2026-10-07-la-criatura-es-el-logotipo-y-nada-mas.md)

| Dónde | Tamaño |
| --- | --- |
| Barra superior de Ajustes, Admin y esta librería | 24 |
| Isla de la biblioteca | 28 |
| Cabecera del login, de las páginas legales y de la extensión | 36 |
| Invitación y autorización del conector | 48 |
| Héroe del login | 88 |
| Página perdida (404) | 128 |

## Favicon e iconos

El favicon no es la criatura sino Tino, el mismo SVG que la landing (`marca/conejo-icono.svg`): de perfil, orejas cortas, sin baldosa, en tinta y en papel con el tema oscuro del sistema. `app/icon.svg`, y en su versión clara `app/favicon.ico` (16 a 64) e `app/icon.png` (256); `app/apple-icon.png` (180) y `public/app-icon-512.png` (el del manifiesto) sobre papel. Los iconos de la extensión de Chrome siguen siendo la criatura. En Claude, el logo del conector MCP sale del favicon. → [decisión](decisiones/2026-11-03-el-favicon-es-tino-el-mismo-de-la-landing.md)

| Rasgo | Valor |
| --- | --- |
| Forma | Silueta de perfil: dos orejas (la de atrás inclinada −12°), el cuerpo como una gota ancha y el visor, una raya que mira a la derecha |
| Tinta | `#1B1B18` sobre papel `#EDE6D6`; el visor en `#F6F1E6` |
| En oscuro | El SVG se invierte solo (`prefers-color-scheme`): cuerpo `#EDE6D6`, visor `#141412` |
| Trazo | Orejas con contorno de 2,4 y unión redonda; visor de 6,2 con extremos redondos |
| Lienzo | 63 × 63; los PNG llevan fondo de papel, el SVG va transparente |

Dentro de la app, el mismo dibujo es `TinoMark` (`components/TinoMark.tsx`): el SVG en línea, el cuerpo en `currentColor` y el visor recortado del color de lo que tiene detrás (`--tino-mark-visor`, por defecto `--surface-page`), para que siga el tema de la app y no el del sistema. Hoy es la marca de la barra de la portada sin sesión (`GuestStart`, 32). → [decisión](decisiones/2026-11-03-la-portada-sin-sesion-lleva-a-tino-plano.md)

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

- Donde haga falta la marca, `Logo` con su `size`. No dibujar la criatura en otros sitios ni darle estados sin decisión nueva.
- Tino, el peluche de la landing, vive en el Inicio y es la búsqueda del tablón ([Componentes](componentes.md#tino-en-el-inicio), [decisión](decisiones/2026-10-20-tino-entra-en-el-inicio-y-es-la-busqueda-del-tablon.md)). No sustituye a la criatura del logotipo. Lo que dice sale de la hoja de copy por estado y va en `t.tino`: solo habla de lo guardado, no se inventa gusto y en un error no bromea.
- El tile de la Isla muestra el espacio, no la mascota. → [decisión](decisiones/2026-10-07-el-tile-de-la-isla-muestra-el-espacio-no-la-mascota.md)
- Nada de "savvia.studio" ni de los nombres anteriores en la interfaz ni en los correos. Los correos salen de `hola@criterio.design` (Resend, dominio verificado), van en texto plano y firman "Eric, Andoni y Alberto" ([decisión](decisiones/2026-10-10-correos-solo-texto.md)), y la imagen al compartir dice solo "criterio.design".
