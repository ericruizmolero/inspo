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

El mismo dibujo es el favicon (`app/favicon.ico`, `app/icon.png`), el icono de Apple (`app/apple-icon.png`, sobre papel porque iOS rellena la transparencia de negro) y los iconos de la extensión de Chrome. En Claude, el logo del conector MCP sale del favicon.

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
- El tile de la Isla muestra el espacio, no la mascota. → [decisión](decisiones/2026-10-07-el-tile-de-la-isla-muestra-el-espacio-no-la-mascota.md)
- Nada de "savvia.studio" ni de los nombres anteriores en la interfaz ni en los correos. Los correos salen de `hola@criterio.design` (Resend, dominio verificado), firman "criterio.design, la biblioteca de inspiración de tu equipo", y la imagen al compartir dice solo "criterio.design".
