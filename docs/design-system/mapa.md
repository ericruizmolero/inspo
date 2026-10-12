# Mapa de la app

Todas las páginas, quién puede verlas y qué hay en cada una. El paso sin sesión lo decide `proxy.ts` (lista `PUBLIC`); el permiso real (espacio, rol, socio) lo comprueba cada página.

## La biblioteca (una sola página con estados)

La app vive en `/`. Lo que se ve depende de la query, sin cambiar de página, para que el tablero no se vuelva a montar.

| URL | Qué se ve |
| --- | --- |
| `/` sin sesión | Portada de invitado (`GuestStart`) |
| `/?in=home` | Inicio: "¿Qué vas a hacer?" y los proyectos |
| `/?in=inbox` | Inbox: lo que no está en ningún proyecto |
| `/?in=library` | Toda la biblioteca |
| `/?in=templates` | Descubrir: los ejemplos |
| `/?in=discover` | Descubrir: los recursos, la lista de la web de marketing con la miniatura que sigue al puntero |
| `/?in=skills` | Descubrir: las skills para agentes, la lista de la web de marketing como tarjetas |
| `/?in=<proyecto>` | Un proyecto: tablero hasta "Ya tengo mis referencias", luego Sistema |
| `&view=board` / `&view=system` | Fuerza tablero o Sistema dentro del proyecto |
| `&view=system&brief=1` | Sistema con el panel Brief abierto; el panel se abre y la URL suelta `brief` (lo usa ⌘K → "Abrir el brief") |
| `?add=<url>` | Abre "Añadir" con esa URL (viene del login de invitado) |
| `/i/[id]` | La biblioteca con la ficha de una referencia abierta (enlace para compartir) |

## Cuenta y equipo

| URL | Acceso | Qué hay |
| --- | --- | --- |
| `/settings/account` | Sesión | Nombre, foto, tema, idioma, sonidos y los correos del equipo (resumen diario, respuestas) |
| `/settings/invite` | Sesión | Invitaciones personales al producto: cuántas quedan, crear un enlace (se enseña una vez) o mandarlo a un correo, y la lista de las hechas (sin usar, usada por quién, revocada) con Revocar en las sin usar. Dice que no meten a nadie en tu espacio y enlaza a Miembros. También desde el menú de espacio, "Invitar a alguien" |
| `/settings/workspace` | Sesión (editar: quien gestiona) | Nombre y logo del espacio, idioma del modelo, Exportar (el propietario baja el JSON de `/api/workspace/export`) y Tus espacios (salir o eliminar) |
| `/settings/members` | Sesión | Miembros e invitaciones; `?create=1` abre "Crear equipo" |
| `/settings/plan` | Sesión (espacios del plan: quien paga o gestiona; crear y traer: quien paga) | Los cuatro planes primero (precio al mes en EUR o en USD según el idioma, el anual debajo; cuatro columnas desde 1088 px, dos hasta 860, una por debajo), luego cuotas (la IA, compartida entre los espacios del plan), asientos, referencias y almacenamiento ("143 de 200", "0,4 de 1 GB", por espacio), las búsquedas de un plan de pago como "N, uso justo" sin barra, los espacios que paga el plan con "Espacio nuevo" y "Traer un espacio aquí", y gasto de IA. No enlaza a `/pricing/` de la web: ya enseña los cuatro planes |
| `/settings/extension` | Sesión | Claves de la extensión |
| `/settings/feedback` | Sesión | El feedback que ha mandado la persona |

## Internas (solo socios; al resto, 404)

| URL | Qué hay |
| --- | --- |
| `/admin/overview`, `usage`, `people`, `feedback`, `failures`, `access`, `waitlist` | Actividad de toda la app; `failures` lista lo que falló sin verse (`lib/log.ts`); `people` dice quién invitó a cada uno; `access` lleva el interruptor del registro (`signup_mode`) y da más invitaciones personales a una cuenta; `waitlist` es la lista de espera, las oleadas, las invitaciones del equipo y cómo fue cada oleada; `?dias=` cambia el periodo. "Dónde pasan el tiempo" nombra los sitios como la interfaz: Inicio, Inbox, Tablón, Pulido, Sistema, Ficha, Búsqueda, Recursos, Ejemplos, Skills, Añadir, Ajustes, Equipo, Planes, Extensión, Actividad, Sistema de diseño y Conector ([decisión](decisiones/2026-10-07-el-panel-de-actividad-nombra-los-sitios-como-la-interfaz.md)) |
| `/library/…` | Esta librería: Introducción, Fundamentos (Principios, Tokens y una página por familia: color, tipografía, espaciado, radios y sombras, movimiento, sonido, iconos, pantalla), Componentes (Botones, Marca, catálogo), Construir y Mantenimiento (técnico, desarrollo, stack, seguridad y políticas, decisiones) |

Se da acceso con `npm run admin -- <correo>`. Las invitaciones también salen de la consola: `npm run access -- invite <correo> [--uses N] [--no-mail]` y `npm run access -- wave <n> [nombre]`.

## Públicas

| URL | Qué hay |
| --- | --- |
| `/login` | Acceso con collage fijo; con sesión, salta a `next` |
| `/invite/[id]` | Aceptar una invitación (pasa el proxy, pero la página pide sesión) |
| `/s/[token]` | La marca de un proyecto compartida por enlace, de solo lectura, con criterio.md para copiar o descargar. El token es la prueba; no se indexa: la página lo dice en sus metadatos y todo `/s/*` (también `md`, `download`, `f`, `font`, `fonts`) lleva `X-Robots-Tag: noindex, nofollow` desde `next.config.ts` |
| `/privacy`, `/terms`, `/extension/privacy` | Redirección permanente (308, `next.config.ts`) a la misma página de la web de marketing (`MARKETING_URL` en `lib/site.ts`). → [decisión](decisiones/2026-10-11-las-paginas-legales-y-los-recursos-viven-en-la-web-de-marketing.md) |
| `/unsubscribe?u=&k=&s=` | El enlace de un clic al pie de cada correo del equipo: apaga ese tipo de correo al abrirse, sin sesión (la firma `s` es la prueba, `lib/notify.ts`), y ofrece volver a activarlo. `/api/unsubscribe` recibe el POST del botón "Cancelar suscripción" del cliente de correo (`List-Unsubscribe`) |
| `/opengraph-image`, `/twitter-image` | Tarjeta para compartir |
| `/robots.txt` | `app/robots.ts`: abre las públicas y cierra `/api/`, `/i/`, `/settings`, `/admin`, `/library`, `/invite/`, `/extension/`, `/mcp`, `/unsubscribe` y `/.well-known/`. `/s/` queda abierta a propósito: una página cerrada nunca le enseña su `noindex` al rastreador. Una ruta nueva con sesión entra aquí |
| `/sitemap.xml` | `app/sitemap.ts`: `/` y `/login`, con la URL de `lib/site.ts`. Las páginas legales, los recursos, las skills, los precios y la extensión están en el sitemap de la web de marketing (`marketing-site/src/pages/sitemap.xml.ts`, sale de `PAGES` en `marketing-site/src/i18n.ts`) |
| `/manifest.webmanifest` | `app/manifest.ts`: nombre, iconos (`/icon.png`, `/apple-icon.png`, `/icon-512.png`) y el color de Board |

Las tres últimas no pasan por `proxy.ts` (salen del `matcher`): las piden buscadores y navegadores sin sesión.

## Extensión

| URL | Acceso | Qué hay |
| --- | --- | --- |
| `/extension/install` | Sesión | Guía para instalar el zip; la extensión la abre al instalarse. La versión pública, sin conectar, es `/extension/` de la web de marketing |
| `/extension/connect` | Sesión | Conectar la extensión a un espacio |
| `/extension/download` | Pública (`proxy.ts`) | El zip de la extensión; lo ofrecen la guía de la app y `/extension/` de la web de marketing |

Importar no es una ruta: es un diálogo (`ImportDialog`) que se abre desde el menú Conectores, en la barra de arriba y en el menú de móvil. → [decisión](decisiones/2026-10-08-importar-vive-en-conectores-por-defecto.md)

## Redirecciones antiguas

`/equipo` → `/settings/members`, `/planes` → `/settings/plan`, `/invitacion/:id` → `/invite/:id` (`next.config.ts`). No borrarlas: hay correos enviados con esos enlaces.

## Web de marketing

`criterio.design`, en `marketing-site/` (Astro estático). Cada página está en inglés en la raíz y en castellano bajo `/es/`, con `hreflang` y su entrada en el sitemap; la lista es `PAGES` en `marketing-site/src/i18n.ts`, que da también el pie (Recursos, Skills, Precios, Extensión, Privacidad, Términos).

| Ruta | Qué es |
| --- | --- |
| `/`, `/es/` | Portada con el botón de entrada a la app |
| `/resources/`, `/es/resources/` | Las webs donde buscamos referencias, por grupos, con buscador y tipo (`?q=`, `?kind=`) y "Guardar en Criterio" (`app.criterio.design/?add=<url>`) |
| `/skills/`, `/es/skills/` | Las skills para agentes por tema, con autor, qué hacen y el comando de instalar con Copiar; buscador y tema en la dirección (`?q=`, `?topic=`) |
| `/pricing/`, `/es/pricing/` | Los cuatro planes (precio al mes y anual, en USD o EUR según el idioma), lo que incluye cada uno, una tabla con las cifras y "Empieza gratis" al login de la app |
| `/extension/`, `/es/extension/` | Qué hace la extensión y cómo instalarla, con el zip de `app.criterio.design/extension/download` y el enlace a su privacidad |
| `/privacy/`, `/terms/`, `/extension/privacy/` (y `/es/…`) | Política de privacidad, términos de uso y privacidad de la extensión (esta última enlazada desde `/extension/` y la Chrome Web Store, no desde el pie) |
| `/sitemap.xml`, `/robots.txt` | El sitemap sale de `PAGES`; `robots.txt` lo nombra |

→ [legal y recursos](decisiones/2026-10-11-las-paginas-legales-y-los-recursos-viven-en-la-web-de-marketing.md), [skills, precios y extensión](decisiones/2026-10-11-las-skills-los-precios-y-la-extension-tienen-pagina-en-la-web-de-marketing.md)
