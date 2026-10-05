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
| `/?in=discover`, `/?in=templates` | Descubrir: recursos y plantillas |
| `/?in=<proyecto>` | Un proyecto: tablero hasta "Ya tengo mis referencias", luego Sistema |
| `&view=board` / `&view=system` | Fuerza tablero o Sistema dentro del proyecto |
| `?add=<url>` | Abre "Añadir" con esa URL (viene del login de invitado) |
| `/i/[id]` | La biblioteca con la ficha de una referencia abierta (enlace para compartir) |

## Cuenta y equipo

| URL | Acceso | Qué hay |
| --- | --- | --- |
| `/settings/account` | Sesión | Nombre, foto, tema e idioma |
| `/settings/workspace` | Sesión (editar: quien gestiona) | Nombre y logo del espacio |
| `/settings/members` | Sesión | Miembros e invitaciones; `?create=1` abre "Crear equipo" |
| `/settings/plan` | Sesión | Plan, cuotas, asientos y gasto de IA |
| `/settings/extension` | Sesión | Claves de la extensión |
| `/settings/feedback` | Sesión | El feedback que ha mandado la persona |

## Internas (solo socios; al resto, 404)

| URL | Qué hay |
| --- | --- |
| `/admin/overview`, `usage`, `people`, `feedback`, `access` | Actividad de toda la app; `?dias=` cambia el periodo |
| `/library/…` | Esta librería |

Se da acceso con `npm run admin -- <correo>`.

## Públicas

| URL | Qué hay |
| --- | --- |
| `/login` | Acceso con collage fijo; con sesión, salta a `next` |
| `/invite/[id]` | Aceptar una invitación (pasa el proxy, pero la página pide sesión) |
| `/extension/privacy` | Privacidad de la extensión, enlazada desde la Chrome Web Store |
| `/opengraph-image`, `/twitter-image` | Tarjeta para compartir |

## Extensión

| URL | Acceso | Qué hay |
| --- | --- | --- |
| `/extension/install` | Sesión | Guía para instalar el zip |
| `/extension/connect` | Sesión | Conectar la extensión a un espacio |
| `/extension/download` | Sesión | El zip de la extensión |

## Redirecciones antiguas

`/equipo` → `/settings/members`, `/planes` → `/settings/plan`, `/invitacion/:id` → `/invite/:id` (`next.config.ts`). No borrarlas: hay correos enviados con esos enlaces.
