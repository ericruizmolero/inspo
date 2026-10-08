# Desarrollo

Decisiones de cómo construimos, no de cómo se ve.

## Stack

- **Next.js 16** (App Router). Antes de tocarlo, leer la doc en `node_modules/next/dist/docs/` (AGENTS.md).
- React 19, Tailwind 4 + CSS propio con tokens, shadcn (`base-nova`) sobre Base UI, lucide, React Compiler activado (`reactCompiler` en `next.config.ts`: no hace falta memoizar a mano), WAAPI y CSS para el movimiento. cuelume para los sonidos de la interfaz, siempre a través de `lib/ui-sounds.ts`. GSAP se quitó el 2026-10-05: no volver a añadirlo sin decisión.
- Auth: Better Auth con organizaciones (workspaces). BD: Drizzle (Postgres/Neon en producción). Ficheros: R2 / Vercel Blob. Correo: Resend.
- Producción en Vercel (team criterio-design), región Frankfurt; las migraciones corren en el build, así una migración rota para el deploy.

## Conector MCP

- `/mcp` es un servidor MCP (Streamable HTTP, sin sesión) escrito a mano en `lib/mcp/`: `server.ts` (JSON-RPC), `tools.ts`, `prompts.ts`, `pieces.ts` (lo que lee y escribe, sobre las mismas funciones que los botones), `oauth.ts` (servidor OAuth 2.1 propio: registro dinámico, PKCE, tokens con hash en `mcp_client` y `mcp_grant`), `auth.ts` (bearer: token OAuth o llave de la extensión). Metadatos en `/.well-known/`, token y registro en `/api/mcp/`, permiso en `/mcp/authorize`. Todo abierto en `proxy.ts` menos el permiso.
- Las descripciones de las herramientas son el contrato con el modelo: en inglés, con lo que devuelve y cuándo usarla. Cambiar un comportamiento = cambiar su descripción.
- `npm run check:mcp -- --write` recorre el flujo entero contra el dev server local (registro, permiso, tokens, herramientas); con `--write` escribe en un proyecto "Prueba MCP". En producción, un cliente necesita la URL pública (`criterio.design/mcp`); el `iss` y los enlaces salen de `APP_URL` allí y del `Host` en local.
- No se usa el SDK de MCP ni el plugin OAuth de Better Auth: nada que toque la autenticación que ya funciona. → [decisión](decisiones/2026-10-06-conector-mcp-lee-el-md-y-escribe-piezas.md)

## Pulido en equipo

- Un voto por persona y referencia en `polish_vote` (migración `0025`); `closed_at` vacío = voto abierto. Votar es `votePolish`, cerrar `closeProjectPolish` (solo quien gestiona), devolver `restoreToBoard` (`app/actions/library.ts`, lógica en `lib/polish-votes.ts`).
- Los votos viajan con la biblioteca (`initialPolishVotes` en `lib/library.ts`) y cuentan en su sello (`libraryStamp`): los de los compañeros llegan con la consulta de cada 15 s, sin canal aparte. Los propios se aplican al momento en el cliente y se superponen a lo que llegue mientras se guardan (`voteWrites` en `InspoClient.tsx`).
- Lo que suman los votos se lee con `lib/polish-tally.ts` (sin servidor): lo usan la vista, la pestaña y el aviso de la ficha.
- Quitar una referencia de un tablón a mano borra sus votos allí (`unfileItems`); sacarla al cerrar el pulido los conserva, que son los que dicen quién la olvidó. → [decisión](decisiones/2026-10-06-en-equipo-el-pulido-es-una-votacion-que-se-cierra.md)

## Contenido de terceros

- Un fichero ajeno que copiamos (un pin, una imagen guardada de una web, un vídeo) guarda su página en `inspo_item.source`, y todo lo que lo cita enlaza esa página, no nuestro fichero.
- Lo que viene de X, Pinterest, Are.na o Cosmos (`staysInside`, `lib/url.ts`: un post, o una imagen, vídeo o texto cuya página está en una de esas plataformas) no se enseña sin sesión: un enlace compartido lo nombra y apunta al original.
- Importar un tablero (`lib/boards/`): `match.ts` reconoce la dirección (puro, también en el cliente), `read.ts` lee el tablero, `parse.ts` valida cada respuesta con zod y la convierte en `Found` (página, enlace, imágenes, texto), y `entryOf` decide qué `Entry` es (`entries.ts`). Are.na tiene API pública (`api.are.na/v3`, sin token, 30 llamadas por minuto). Pinterest y Cosmos no: se usan los endpoints que llaman sus propias webs (`/resource/BoardFeedResource/get/` de Pinterest, el GraphQL `GetClusterElements` de Cosmos), no oficiales, y pueden cambiar sin aviso. Una respuesta que no se entiende se trata como la plataforma sin responder, nunca como un tablero a medias. `npm run check:boards` prueba los parsers con respuestas reales guardadas en `scripts/fixtures/boards` (8 de octubre de 2026); `-- --live` lee tableros reales y escribe lo que traen por tipo.
- Lo importado se guarda por `addMany` (`lib/add-many.ts`, también la ruta por lotes de la extensión): una imagen se copia con su página en `source`, un texto se guarda en una ruta que decide su página (`putText` con `from`, `lib/text-refs.ts`), así importar dos veces no duplica. Los lotes los limita `lib/batch-limits.ts`: 25, o 10 si llevan imágenes. → [decisión](decisiones/2026-10-08-importar-un-tablero-trae-todo-lo-que-criterio-sabe-guardar.md)
- Una petición de retirada se ejecuta con `npm run takedown <url>` (sin `--apply` solo lista). → [decisión](decisiones/2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md)

## Seguridad

- CSP con nonce en cada página (`proxy.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'`. Un script inline propio lleva `nonce` (lo lee `app/layout.tsx` de `x-nonce`); nunca `onerror=` ni otros manejadores en HTML, tampoco dentro de un `srcDoc`. Esa cabecera sustituye a la de `next.config.ts`, así que lleva también `frame-ancestors`.
- Lo que servimos de un tercero desde nuestro origen (`/api/og`, las fuentes en `lib/font-proxy.ts`) sale con un tipo fijo (imagen rasterizada o fuente), `nosniff` y `sandbox`: un SVG o un HTML ajeno en criterio.design correría con la sesión de quien lo abre.
- Límites propios con `allow()` (`lib/rate-limit.ts`, en la tabla `rate_limit`, claves `app:`): enlaces mágicos por dirección, feedback por persona, capturas por workspace.
- La propiedad de una tarjeta es `createdBy`, nunca el nombre de quien la guardó.

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

## Flujo de trabajo

- Se revisa en **localhost** (la preview de Ship Studio). No subir tras cada cambio; a producción solo cuando se pide, directo.
- Antes de fusionar a `main`: comprobar qué depende de datos que solo existen en local (scripts, filas por workspace).
- Una sesión de agente por rama/checkout; varias sesiones sobre el mismo árbol sin commits se pisan.
- Tras cambiar de rama o si la CSS parece vieja: `rm -rf .next`. Matar el dev server por puerto, nunca `pkill -f "next dev"`.
- Commits con el estilo de la casa: una frase que describe lo que ahora hace la app ("A tab's × takes the ring's place instead of sitting on it"), en inglés, sin prefijos tipo `feat:`.
- PRs: la fusión la hace una persona del equipo.

## Rendimiento

- Medir antes de opinar: sonda con `requestAnimationFrame` + `PerformanceObserver('longtask')` vía `console.warn`; en dev los avisos del navegador llegan a `.next/dev/logs/next-development.log`.
- La preview de Ship Studio está oculta (sin rAF ni autoplay): para medir, Chrome headless con puppeteer-core.
