# Desarrollo

Decisiones de cómo construimos, no de cómo se ve.

## Stack

Cada servicio y librería, con su cuenta y cómo se mantiene, está en [Stack tecnológico](stack.md). Lo que decide cómo se construye: Next.js 16 (leer `node_modules/next/dist/docs/` antes de tocarlo), React 19 con el React Compiler activado (no hace falta memoizar a mano), Tailwind 4 con CSS propio y tokens, shadcn (`base-nova`) sobre Base UI, WAAPI y CSS para el movimiento (GSAP se quitó el 2026-10-05: no volver a añadirlo sin decisión), cuelume para los sonidos siempre a través de `lib/ui-sounds.ts`.

## Conector MCP

- `/mcp` es un servidor MCP (Streamable HTTP, sin sesión) escrito a mano en `lib/mcp/`: `server.ts` (JSON-RPC), `tools.ts`, `prompts.ts`, `pieces.ts` (lo que lee y escribe, sobre las mismas funciones que los botones), `oauth.ts` (servidor OAuth 2.1 propio: registro dinámico, PKCE, tokens con hash en `mcp_client` y `mcp_grant`), `auth.ts` (bearer: token OAuth o llave de la extensión). Metadatos en `/.well-known/`, token y registro en `/api/mcp/`, permiso en `/mcp/authorize`. Todo abierto en `proxy.ts` menos el permiso.
- Las descripciones de las herramientas son el contrato con el modelo: en inglés, con lo que devuelve y cuándo usarla. Cambiar un comportamiento = cambiar su descripción.
- `npm run check:mcp -- --write` recorre el flujo entero contra el dev server local (registro, permiso, tokens, herramientas); con `--write` escribe en un proyecto "Prueba MCP". En producción, un cliente necesita la URL pública (`criterio.design/mcp`); el `iss` y los enlaces salen de `APP_URL` allí y del `Host` en local.
- No se usa el SDK de MCP ni el plugin OAuth de Better Auth: nada que toque la autenticación que ya funciona. → [decisión](decisiones/2026-10-06-conector-mcp-lee-el-md-y-escribe-piezas.md)

## Pulido en equipo

- Un voto por persona y referencia en `polish_vote` (migración `0025`); `closed_at` vacío = voto abierto. Votar es `votePolish`, cerrar `closeProjectPolish` (solo quien gestiona), devolver `restoreToBoard` (`app/actions/library.ts`, lógica en `lib/polish-votes.ts`).
- Los votos viajan con la biblioteca (`initialPolishVotes` en `lib/library.ts`) y cuentan en su sello (`libraryStamp`): los de los compañeros llegan con la consulta de cada 15 s, sin canal aparte. Los propios se aplican al momento en el cliente y se superponen a lo que llegue mientras se guardan (`voteWrites` en `InspoClient.tsx`).
- Lo que suman los votos se lee con `lib/polish-tally.ts` (sin servidor): lo usan la vista, la pestaña y el aviso de la ficha.
- El brief de un proyecto (qué es, para quién, la web del cliente en un rediseño) vive en `project.brief`, con su tipo en `types/brief.ts` y la escritura en `lib/brief.ts`. Hasta la migración `0029` estaba en `project.polish`, junto a lo que guardaba el Pulido de antes del 04/10.
- Quitar una referencia de un tablón a mano borra sus votos allí (`unfileItems`); sacarla al cerrar el pulido los conserva, que son los que dicen quién la olvidó. → [decisión](decisiones/2026-10-06-en-equipo-el-pulido-es-una-votacion-que-se-cierra.md)

## Avisos del equipo

- Una sola lista de hechos (`teamEvents` en `lib/notify.ts`: referencias, proyectos, comentarios, conversación y propuestas de área, decisiones del equipo, votos y cierres del Pulido) alimenta las tres salidas: la campanita de la Isla (`TeamBell`, `teamActivity`), el resumen diario por correo (`sendDigests`, cron `morning`) y los correos al momento (`notifyReply`, `notifyProposalResolved`). Lo propio nunca sale; en un espacio personal no hay nada.
- Las frases de las líneas viven en `lib/i18n/<locale>/ui.ts` (`teamActivity.line`) y las usan la campanita y el correo; el resto del correo en `mail.ts` (`digest`, `reply`, `proposal`, `paused`, `team`). El idioma es el de quien recibe, nunca el de quien escribe.
- Reglas para no ser pesados: un resumen al día como mucho; nada si no pasó nada o si el heartbeat (`activity_segment`) dice que la persona ya entró después; el primer resumen cubre solo el día anterior (nunca el histórico) y ninguno más de una semana; se espacian según lo que la persona lleve sin entrar (`GAP_DAYS`: en la app estos dos días, uno al día; hasta una semana fuera, uno cada tres días; más, uno a la semana), de modo que quien se va mientras el equipo sigue recibe unos ocho en el mes y no treinta; al mes sin abrir la app el resumen se apaga solo con un correo que lo dice. Lo único inmediato: la respuesta a un comentario o un pin tuyo y la resolución de una propuesta tuya, con `reply-to` a quien escribió.
- Apagar y encender: dos interruptores en Cuenta (`user.digest_emails`, `user.reply_emails`), el enlace firmado de un clic al pie de cada correo (`/unsubscribe`) y la cabecera `List-Unsubscribe` para el botón del cliente de correo. Las marcas por persona y equipo van en `member` (`digest_sent_at`, `activity_seen_at`), migración `0026`.
- Los correos al momento salen tras responder (`inBackground` usa `after` de Next; fuera de una petición, al instante). `npm run check:notifications` comprueba las partes puras y monta los resúmenes de hoy contra la BD local sin enviar nada. → [decisión](decisiones/2026-10-08-avisos-del-equipo-campanita-y-resumen-diario.md)

## Importar un tablero

- Importar un tablero (`lib/boards/`): `match.ts` reconoce la dirección (puro, también en el cliente), `read.ts` lee el tablero, `parse.ts` valida cada respuesta con zod y la convierte en `Found` (página, enlace, imágenes, texto), y `entryOf` decide qué `Entry` es (`entries.ts`). Are.na tiene API pública (`api.are.na/v3`, sin token, 30 llamadas por minuto). Pinterest y Cosmos no: se usan los endpoints que llaman sus propias webs (`/resource/BoardFeedResource/get/` de Pinterest, el GraphQL `GetClusterElements` de Cosmos), no oficiales, y pueden cambiar sin aviso. Una respuesta que no se entiende se trata como la plataforma sin responder, nunca como un tablero a medias. `npm run check:boards` prueba los parsers con respuestas reales guardadas en `scripts/fixtures/boards` (8 de octubre de 2026); `-- --live` lee tableros reales y escribe lo que traen por tipo.
- Lo importado se guarda por `addMany` (`lib/add-many.ts`, también la ruta por lotes de la extensión): una imagen se copia con su página en `source`, un texto se guarda en una ruta que decide su página (`putText` con `from`, `lib/text-refs.ts`), así importar dos veces no duplica. Los lotes los limita `lib/batch-limits.ts`: 25, o 10 si llevan imágenes. → [decisión](decisiones/2026-10-08-importar-un-tablero-trae-todo-lo-que-criterio-sabe-guardar.md)
- El aviso final lo monta `importSummary` (`lib/boards/summary.ts`, puro): importado es solo lo que `addMany` devuelve como `added`; lo que ya estaba (`existed`), lo que se quedó fuera y lo que falló van en frases aparte. → [decisión](decisiones/2026-10-08-al-importar-lo-que-ya-estaba-no-cuenta-como-importado.md)
- El proyecto de un tablero lo decide una sola función, `projectForBoard` (`lib/projects.ts`): el que ya lleva su nombre (comparado tal como se guarda, limpio y cortado a 60), o uno nuevo la primera vez. La usan la web (acción `boardProject`, `app/actions/library.ts`) y la extensión (`POST /api/ext/v1/projects { name }` → `{ project: { id, name } }`, con la misma llave que el `GET`). Importar el mismo tablero desde cualquiera de las dos llena el mismo proyecto. → [decisión](decisiones/2026-10-08-la-extension-pone-un-boton-para-importar-un-tablero.md)

## Contenido de terceros y seguridad

Las reglas de acceso, cabeceras, salida a la red, ficheros ajenos, datos y políticas públicas están en [Seguridad y políticas](seguridad.md). Lo que afecta a cómo se construye: todo fetch de una URL ajena pasa por `safeFetch`, todo Chromium por `lib/egress-proxy.ts`; un script inline propio lleva el `nonce` y nunca hay manejadores en HTML; una superficie nueva sin sesión pasa las referencias por `staysInside` antes de enseñar una copia; una clave o un servicio nuevo se apunta en el stack y en la política de privacidad en el mismo trabajo.

## Idiomas

- Código, comentarios, nombres de campos y rutas en **inglés**.
- Textos de UI nunca en el componente: van a `lib/i18n/en/*.ts` **y** `lib/i18n/es/*.ts` a la vez. Inglés por defecto, cookie `lang`. La extensión usa `_locales/{en,es}/messages.json`. → [UI bilingüe](decisiones/2026-09-23-ui-bilingue-i18n.md)
- Lo que lee el equipo directamente (handoffs, issues, este sistema) en castellano.

## IA

- Todo gasto de modelo pasa por `recordUsage()` con su acción, con coste real.
- Toda ruta que llama a un modelo comprueba antes `assertQuota(ctx.workspace, "ai")`. Confirmar en el agente (`{ run }`) solo ejecuta borrados y deshacer: el resto iría fuera de la cuota.
- Prefiltro barato (Jev) antes del modelo caro cuando hay que cribar muchas referencias.
- Cambiar un prompt = subir su `PROMPT_VERSION`.
- Visión con Haiku; razonamiento largo con cuidado: el razonamiento consume `max_tokens`.

## Logs y fallos

- En el servidor no se usa `console`: se usa `log.info|warn|error("area.que", { err, ref })` de `lib/log.ts`. Sale una línea JSON con el identificador de la petición (`x-request-id`, que pone `proxy.ts`; en Vercel es su `x-vercel-id`), la ruta y `userId` y `organizationId`, nunca un correo. Los correos y las firmas de URL de R2 salen tapados (`redact`, `lib/error-reports.ts`).
- Lo que falla y alguien notaría (una llamada al modelo, una captura, un correo, un trabajo, una acción, una herramienta del MCP, un borrado en R2) va con `recordFailure(kind, what, err)`. Guarda una fila en `failure`, visible 30 días en `/admin/failures`. Ya lo hacen `llm()`, `captureHero`, `sendMail`, los trabajos de etiquetas, `withCtx` y el MCP.
- Un `catch` que se traga el error lleva un comentario con el porqué. Si no hay porqué, se registra.
- Para seguir un "no me ha funcionado": el correo da la persona, `/admin/failures` da la hora y el identificador, y el identificador lleva a los logs.

## Flujo de trabajo

- Se revisa en **localhost** (la preview de Ship Studio). No subir tras cada cambio; a producción solo cuando se pide, directo.
- Antes de fusionar a `main`: comprobar qué depende de datos que solo existen en local (scripts, filas por workspace).
- Una sesión de agente por rama/checkout; varias sesiones sobre el mismo árbol sin commits se pisan.
- Tras cambiar de rama o si la CSS parece vieja: `rm -rf .next`. Matar el dev server por puerto, nunca `pkill -f "next dev"`.
- Commits con el estilo de la casa: una frase que describe lo que ahora hace la app ("A tab's × takes the ring's place instead of sitting on it"), en inglés, sin prefijos tipo `feat:`.
- PRs: la fusión la hace una persona del equipo.
- CI (`.github/workflows/ci.yml`), en cada PR y push a `main`, tres jobs: `types-and-build` (`next typegen`, `tsc --noEmit`, `npm run build` con valores falsos de Better Auth), `checks` (`check:design`, `check:design-system`, `check:usage`, `check:boards`) y `db-checks` (migraciones en un Postgres con pgvector vacío, luego `check:seats`, `check:locale`, `check:url-keys`, `check:notifications`, `check:postgres`). Sin claves de R2, modelos ni correo: un check que las pida no entra. Los jobs se vuelven obligatorios cuando un admin del repo (Eric) añade en GitHub una regla para `main` que los exija por nombre; renombrar un job rompe esa regla.

## Rendimiento

- Medir antes de opinar: sonda con `requestAnimationFrame` + `PerformanceObserver('longtask')` vía `console.warn`; en dev los avisos del navegador llegan a `.next/dev/logs/next-development.log`.
- La preview de Ship Studio está oculta (sin rAF ni autoplay): para medir, Chrome headless con puppeteer-core.
- Con el React Compiler, lo que un render lee de un `Map` de módulo queda memoizado por sus entradas visibles (`web`): rellenar el mapa y forzar un render con un contador no repinta. El dato tiene que pasar por `useState` (`usePost` en `components/post-cache.ts`).
- Un fichero guardado solo se borra cuando ninguna fila lo usa, y "usar" incluye ser la referencia misma (`web`), no solo la miniatura (`dropUnusedFiles` en `lib/item-files.ts`). Una imagen subida es su propia miniatura hasta que llega su copia de tarjeta (`cardCopy`, webp de 1400 px), y ese cambio de miniatura borraba el original en R2 (incidente del 2026-10-08: una imagen subida el 07-10 quedó sin original, con la tarjeta bien y la ficha y "Abrir la imagen" en 404).
- Un post de X se pide a `/api/post` una vez por sesión, para todas las vistas (`components/post-cache.ts`: `loadPost` comparte la petición en vuelo y guarda la respuesta, `usePost` la lee desde un componente). La ficha (`PostView`), la tarjeta del tablón sin imagen (`InspoCard`) y la tarjeta de Pulido (`PolishView`) pasan por ahí; en Pulido solo piden las tarjetas cercanas a la de delante (`POST_NEAR`), para no lanzar treinta peticiones al montar el tornado.
