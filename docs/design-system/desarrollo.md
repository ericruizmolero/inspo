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
- Quitar una referencia de un tablón a mano borra sus votos allí (`unfileItems`); sacarla al cerrar el pulido los conserva, que son los que dicen quién la olvidó. → [decisión](decisiones/2026-10-06-en-equipo-el-pulido-es-una-votacion-que-se-cierra.md)

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
- Con el React Compiler, lo que un render lee de un `Map` de módulo queda memoizado por sus entradas visibles (`web`): rellenar el mapa y forzar un render con un contador no repinta. El dato tiene que pasar por `useState` (`usePost` en `components/post-cache.ts`).
- Un fichero guardado solo se borra cuando ninguna fila lo usa, y "usar" incluye ser la referencia misma (`web`), no solo la miniatura (`dropUnusedFiles` en `lib/item-files.ts`). Una imagen subida es su propia miniatura hasta que llega su copia de tarjeta (`cardCopy`, webp de 1400 px), y ese cambio de miniatura borraba el original en R2 (incidente del 2026-10-08: una imagen subida el 07-10 quedó sin original, con la tarjeta bien y la ficha y "Abrir la imagen" en 404).
- Un post de X se pide a `/api/post` una vez por sesión, para todas las vistas (`components/post-cache.ts`: `loadPost` comparte la petición en vuelo y guarda la respuesta, `usePost` la lee desde un componente). La ficha (`PostView`), la tarjeta del tablón sin imagen (`InspoCard`) y la tarjeta de Pulido (`PolishView`) pasan por ahí; en Pulido solo piden las tarjetas cercanas a la de delante (`POST_NEAR`), para no lanzar treinta peticiones al montar el tornado.
