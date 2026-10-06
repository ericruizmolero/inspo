# Desarrollo

Decisiones de cómo construimos, no de cómo se ve.

## Stack

- **Next.js 16** (App Router). Antes de tocarlo, leer la doc en `node_modules/next/dist/docs/` (AGENTS.md).
- React 19, Tailwind 4 + CSS propio con tokens, shadcn (`base-nova`) sobre Base UI, lucide, React Compiler activado (`reactCompiler` en `next.config.ts`: no hace falta memoizar a mano), WAAPI y CSS para el movimiento. GSAP se quitó el 2026-10-05: no volver a añadirlo sin decisión.
- Auth: Better Auth con organizaciones (workspaces). BD: Drizzle (Postgres/Neon en producción). Ficheros: R2 / Vercel Blob. Correo: Resend.
- Producción en Vercel (team criterio-design), región Frankfurt; las migraciones corren en el build, así una migración rota para el deploy.

## Conector MCP

- `/mcp` es un servidor MCP (Streamable HTTP, sin sesión) escrito a mano en `lib/mcp/`: `server.ts` (JSON-RPC), `tools.ts`, `prompts.ts`, `pieces.ts` (lo que lee y escribe, sobre las mismas funciones que los botones), `oauth.ts` (servidor OAuth 2.1 propio: registro dinámico, PKCE, tokens con hash en `mcp_client` y `mcp_grant`), `auth.ts` (bearer: token OAuth o llave de la extensión). Metadatos en `/.well-known/`, token y registro en `/api/mcp/`, permiso en `/mcp/authorize`. Todo abierto en `proxy.ts` menos el permiso.
- Las descripciones de las herramientas son el contrato con el modelo: en inglés, con lo que devuelve y cuándo usarla. Cambiar un comportamiento = cambiar su descripción.
- `npm run check:mcp -- --write` recorre el flujo entero contra el dev server local (registro, permiso, tokens, herramientas); con `--write` escribe en un proyecto "Prueba MCP". En producción, un cliente necesita la URL pública (`criterio.design/mcp`); el `iss` y los enlaces salen de `APP_URL` allí y del `Host` en local.
- No se usa el SDK de MCP ni el plugin OAuth de Better Auth: nada que toque la autenticación que ya funciona. → [decisión](decisiones/2026-10-06-conector-mcp-lee-el-md-y-escribe-piezas.md)

## Idiomas

- Código, comentarios, nombres de campos y rutas en **inglés**.
- Textos de UI nunca en el componente: van a `lib/i18n/en/*.ts` **y** `lib/i18n/es/*.ts` a la vez. Inglés por defecto, cookie `lang`. La extensión usa `_locales/{en,es}/messages.json`. → [UI bilingüe](decisiones/2026-09-23-ui-bilingue-i18n.md)
- Lo que lee el equipo directamente (handoffs, issues, este sistema) en castellano.

## IA

- Todo gasto de modelo pasa por `recordUsage()` con su acción, con coste real.
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
