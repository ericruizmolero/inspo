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
| `/?in=discover`, `/?in=templates` | Descubrir: recursos y ejemplos |
| `/?in=<proyecto>` | Un proyecto: tablero hasta "Ya tengo mis referencias", luego Sistema |
| `&view=board` / `&view=system` | Fuerza tablero o Sistema dentro del proyecto |
| `&view=system&brief=1` | Sistema con el panel Brief abierto; el panel se abre y la URL suelta `brief` (lo usa ⌘K → "Abrir el brief") |
| `?add=<url>` | Abre "Añadir" con esa URL (viene del login de invitado) |
| `/i/[id]` | La biblioteca con la ficha de una referencia abierta (enlace para compartir) |

## Cuenta y equipo

| URL | Acceso | Qué hay |
| --- | --- | --- |
| `/settings/account` | Sesión | Nombre, foto, tema, idioma, sonidos y los correos del equipo (resumen diario, respuestas) |
| `/settings/workspace` | Sesión (editar: quien gestiona) | Nombre y logo del espacio, idioma del modelo, Exportar (el propietario baja el JSON de `/api/workspace/export`) y Tus espacios (salir o eliminar) |
| `/settings/members` | Sesión | Miembros e invitaciones; `?create=1` abre "Crear equipo" |
| `/settings/plan` | Sesión (espacios del plan: quien paga o gestiona; crear y traer: quien paga) | Los cuatro planes primero (precio al mes en EUR o en USD según el idioma, el anual debajo; cuatro columnas desde 1088 px, dos hasta 860, una por debajo), luego cuotas (la IA, compartida entre los espacios del plan), asientos, referencias y almacenamiento ("143 de 200", "0,4 de 1 GB", por espacio), las búsquedas de un plan de pago como "N, uso justo" sin barra, los espacios que paga el plan con "Espacio nuevo" y "Traer un espacio aquí", y gasto de IA |
| `/settings/extension` | Sesión | Claves de la extensión |
| `/settings/feedback` | Sesión | El feedback que ha mandado la persona |

## Internas (solo socios; al resto, 404)

| URL | Qué hay |
| --- | --- |
| `/admin/overview`, `usage`, `people`, `feedback`, `failures`, `access`, `waitlist` | Actividad de toda la app; `failures` lista lo que falló sin verse (`lib/log.ts`); `access` lleva el interruptor del registro (`signup_mode`); `waitlist` es la lista de espera, las oleadas, las invitaciones del equipo y cómo fue cada oleada; `?dias=` cambia el periodo. "Dónde pasan el tiempo" nombra los sitios como la interfaz: Inicio, Inbox, Tablón, Pulido, Sistema, Ficha, Búsqueda, Recursos, Ejemplos, Skills, Añadir, Ajustes, Equipo, Planes, Extensión, Actividad, Sistema de diseño y Conector ([decisión](decisiones/2026-10-07-el-panel-de-actividad-nombra-los-sitios-como-la-interfaz.md)) |
| `/library/…` | Esta librería: Introducción, Fundamentos (Principios, Tokens y una página por familia: color, tipografía, espaciado, radios y sombras, movimiento, sonido, iconos, pantalla), Componentes (Botones, Marca, catálogo), Construir y Mantenimiento (técnico, desarrollo, stack, seguridad y políticas, decisiones) |

Se da acceso con `npm run admin -- <correo>`. Las invitaciones también salen de la consola: `npm run access -- invite <correo> [--uses N] [--no-mail]` y `npm run access -- wave <n> [nombre]`.

## Públicas

| URL | Qué hay |
| --- | --- |
| `/login` | Acceso con collage fijo; con sesión, salta a `next` |
| `/invite/[id]` | Aceptar una invitación (pasa el proxy, pero la página pide sesión) |
| `/s/[token]` | La marca de un proyecto compartida por enlace, de solo lectura, con criterio.md para copiar o descargar. El token es la prueba; no se indexa: la página lo dice en sus metadatos y todo `/s/*` (también `md`, `download`, `f`, `font`, `fonts`) lleva `X-Robots-Tag: noindex, nofollow` desde `next.config.ts` |
| `/extension/privacy` | Privacidad de la extensión, enlazada desde la Chrome Web Store |
| `/privacy`, `/terms` | Política de privacidad y términos de uso. Borrador: 404 en producción hasta que `lib/legal.ts` tenga los datos de la sociedad |
| `/unsubscribe?u=&k=&s=` | El enlace de un clic al pie de cada correo del equipo: apaga ese tipo de correo al abrirse, sin sesión (la firma `s` es la prueba, `lib/notify.ts`), y ofrece volver a activarlo. `/api/unsubscribe` recibe el POST del botón "Cancelar suscripción" del cliente de correo (`List-Unsubscribe`) |
| `/opengraph-image`, `/twitter-image` | Tarjeta para compartir |
| `/robots.txt` | `app/robots.ts`: abre las públicas y cierra `/api/`, `/s/`, `/i/`, `/settings`, `/admin`, `/library`, `/invite/`, `/extension/` (menos `/extension/privacy`), `/mcp`, `/unsubscribe` y `/.well-known/`. Una ruta nueva con sesión entra aquí |
| `/sitemap.xml` | `app/sitemap.ts`: `/`, `/login`, `/privacy`, `/terms` y `/extension/privacy`, con la URL de `lib/site.ts`. Una página pública nueva entra aquí |
| `/manifest.webmanifest` | `app/manifest.ts`: nombre, iconos (`/icon.png`, `/apple-icon.png`, `/icon-512.png`) y el color de Board |

Las tres últimas no pasan por `proxy.ts` (salen del `matcher`): las piden buscadores y navegadores sin sesión.

## Extensión

| URL | Acceso | Qué hay |
| --- | --- | --- |
| `/extension/install` | Sesión | Guía para instalar el zip |
| `/extension/connect` | Sesión | Conectar la extensión a un espacio |
| `/extension/download` | Sesión | El zip de la extensión |

Importar no es una ruta: es un diálogo (`ImportDialog`) que se abre desde el menú Conectores, en la barra de arriba y en el menú de móvil. → [decisión](decisiones/2026-10-08-importar-vive-en-conectores-por-defecto.md)

## Redirecciones antiguas

`/equipo` → `/settings/members`, `/planes` → `/settings/plan`, `/invitacion/:id` → `/invite/:id` (`next.config.ts`). No borrarlas: hay correos enviados con esos enlaces.
