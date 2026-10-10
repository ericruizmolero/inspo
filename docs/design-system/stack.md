# Stack tecnológico

Todo lo que hace funcionar criterio.design: qué es cada pieza, dónde se usa en el código, quién tiene la cuenta y qué hay que hacer para mantenerla. No hay servidores propios: cada parte es un servicio gestionado, y el código los une. Las reglas de seguridad de cada pieza están en [Seguridad y políticas](seguridad.md); los pasos para montarlo en local, en [Montar el proyecto](construir/montar.md).

## Servicios

| Pieza | Servicio | Dónde se usa | Cuenta | Cómo se mantiene |
| --- | --- | --- | --- | --- |
| App, API y Chromium | **Vercel**, equipo `criterio-design`, funciones en Fráncfort (`fra1`) | `vercel.json`, `next.config.ts`. Chromium corre dentro de las funciones con `@sparticuz/chromium` (`lib/screenshot.ts`) | `tech@criterio.design` (desde 2026-09-23) | Push a `main` despliega producción; cada PR tiene su preview. Volver atrás: Deployments, el último bueno, "Promote to Production". Plan Hobby, solo para uso no comercial: pasar a Pro antes del primer cobro |
| Dominio | **Namecheap**, `criterio.design`, DNS en Namecheap BasicDNS (no en Vercel) | `BETTER_AUTH_URL`, `APP_URL` en `lib/auth.ts` | Cuenta personal de Eric | Leer los correos de verificación ICANN: el 2026-10-07 el dominio quedó suspendido por uno sin leer. `www` sigue sin apuntar |
| Base de datos | **Neon** Postgres, AWS Fráncfort, con `pgvector` | `lib/db/` (Drizzle sobre `pg`), esquema en `lib/db/schema.ts`, migraciones en `drizzle/` | Integración de Vercel (las variables `DATABASE_URL`, `PG*`, `POSTGRES_*` las pone ella) | Rama `main` para producción y `preview` para todas las previews. Las migraciones corren en el build (`scripts/migrate.ts`): si una falla, no se despliega, y por eso solo añaden ([Desarrollo](desarrollo.md#base-de-datos)). La app entra por el host `-pooler`. Restaurar: consola de Neon, "Restore", el minuto anterior. Plan Free: a Launch cuando Vercel pase a Pro |
| Ficheros | **Cloudflare R2**, bucket privado `criterio-files` (API S3) | `lib/storage.ts` con `@aws-sdk/client-s3`; lectura y subida por URL firmada (`app/api/files/[...key]`, `lib/media-client.ts`) | Pendiente de apuntar quién la tiene | Una llave de solo lectura por persona para `files:pull`; la de escritura solo en Vercel. El CORS del bucket tiene que permitir `PUT` desde cada dominio de la app. Las previews comparten bucket con producción |
| Correo | **Resend** | `lib/mail.ts`, solo texto plano; textos en `lib/i18n/<locale>/mail.ts`; los del equipo (resumen diario, respuestas) en `lib/notify.ts`, con `List-Unsubscribe` | `tech@criterio.design` | `MAIL_FROM` necesita un dominio verificado en Resend. Sin `RESEND_API_KEY` (local) el correo sale por consola y en `.data/last-mail.txt`; `npm run check:notifications` monta los resúmenes sin enviar |
| Identidad | **Better Auth** 1.7 con `magicLink`, `organization` y `lastLoginMethod` | `lib/auth.ts`, handler en `app/api/auth/[...all]`, sesión y espacio activo en `lib/workspace.ts` | Google: proyecto OAuth propio (`GOOGLE_CLIENT_*`) | En producción solo entran el enlace mágico y Google. Apple y X están programados pero sin claves en Vercel; el secreto de Apple caduca cada 6 meses (`npm run apple:secret`) |
| Modelos de lenguaje | **OpenRouter** (todas las llamadas, etiquetas incluidas) | `lib/llm.ts` es el único sitio que llama; cada uso pasa por `recordUsage()` (`lib/usage.ts`) | Pendiente de apuntar quién la tiene | El coste real viene en cada respuesta y se concilia con `npm run check:usage`. Cambiar un modelo = cambiar su variable (tabla de abajo) |
| Búsqueda y pulido | **Typesafe (Jev)** | `lib/jev.ts` con `@typesafe-ai/sdk`; `TYPESAFE_API_KEY` y `TYPESAFE_BASE_URL` | Pendiente de apuntar quién la tiene | Solo texto; unos 0,0004 $ por referencia. Prefiltro barato antes del modelo caro |
| Búsqueda por significado | **pgvector** en Neon, vectores `bge-m3` por OpenRouter | `lib/embed.ts`; columna `inspo_item.embedding` (1024 dimensiones, índice HNSW, migración `0006`) | Con la BD | Cada cambio de palabras manda su trabajo `embed`; el barrido manda otra vez los vectores vacíos |
| Capturas de webs | **puppeteer-core** con el Chrome local o `@sparticuz/chromium` en Vercel | `lib/screenshot.ts`, `lib/page-shots.ts`, `lib/browser-gate.ts` (un Chromium a la vez salvo `CHROME_CONCURRENCY`), salida solo por `lib/egress-proxy.ts` | Con Vercel | El binario hay que incluirlo a mano en cada ruta que lo lanza (`outputFileTracingIncludes` en `next.config.ts`) |
| Lectura de webs bloqueadas | Proxy externo `web-proxy` (`WEB_PROXY_URL`, por defecto un proyecto de Vercel) | `lib/extract.ts` (`viaProxy`), `/api/og` | Proyecto en la cuenta personal de Vercel de Eric | Pendiente moverlo al equipo `criterio-design`. `WEB_PROXY_URL=""` lo apaga |
| Errores y caídas | **Better Stack**: errores (recibe el SDK de Sentry, `@sentry/nextjs`; no hay cuenta de Sentry), uptime y página de estado | `lib/error-reports.ts` (opciones y limpieza de datos personales), `instrumentation.ts` (servidor), `instrumentation-client.ts` (navegador), `app/error.tsx` y `app/global-error.tsx`. Salud: `/api/health` (la app arrancó) y `/api/health/deep` (BD, R2 y trabajos de etiquetas: pendientes, fallidos, el más viejo; 503 si un espacio lleva 15 minutos con trabajo esperando y ninguno empezado). El cron `morning` avisa a su heartbeat al terminar. Logs: JSON por línea (`lib/log.ts`) en los logs de Vercel; el drenaje a Better Stack pide Vercel Pro | Pendiente de apuntar quién la tiene | Variables en Vercel (Production): `NEXT_PUBLIC_BETTERSTACK_DSN` (el DSN de Better Stack Errors, público por diseño, tipo config) y `BETTERSTACK_HEARTBEAT_URL` (secreta); sin ellas no se envía nada. En Better Stack (2026-10-10): monitor de `/api/health` con caducidad del certificado y del dominio, monitor de `/api/health/deep` (alerta si no responde 200, cada 5 minutos), heartbeat diario de `morning` con 2 h de margen, avisos solo por correo. Solo errores, sin trazas (`tracesSampleRate: 0`) |
| Cola de trabajos | **Vercel Queues** (beta, todos los planes), tema `jobs` | `lib/jobs.ts` (`enqueue()`, el único sitio que manda), `lib/job-run.ts` (qué hace cada tipo: `tag`, `embed`, `shot`, `sweep`), consumidor en `app/api/queue/jobs` (sin URL pública, `experimentalTriggers` en `vercel.json`) | Con Vercel: sin cuenta ni claves, entra por OIDC | Cada trabajo corre en su propia función con 300 s. El estado de cada etiquetado vive en su fila (`lib/tag-jobs.ts`), no en la cola. Fuera de Vercel (local, scripts) no hay cola: el trabajo corre en el mismo proceso tras responder. El barrido (`sweep`) se programa solo cada 5 minutos; solo barre el despliegue de producción (`/api/cron/sweep`). Los mensajes vuelven al despliegue que los mandó: borrar un despliegue viejo corta sus reintentos |
| Tareas programadas | **Vercel Cron** | `vercel.json`: `/api/cron/usage-check` (23:00) y `/api/cron/morning` (04:00 UTC: primero los resúmenes del equipo, `lib/notify.ts`, luego el barrido de trabajos); cada ruta comprueba `CRON_SECRET` (`lib/cron-auth.ts`) | Con Vercel | En Hobby solo caben dos crons y corren como mucho una vez al día: lo nuevo de la mañana se mete en `morning`, no en un tercero. Lo que necesita correr más a menudo va por la cola con retraso, como el barrido |
| Extensión de Chrome | Manifest V3, JavaScript sin framework | `extension/chrome/`; se empaqueta en el build con `extension/build.mjs` y se descarga en `/extension/download`; API en `app/api/ext/v1/` | Cuenta de desarrollador de la Chrome Web Store pendiente (`extension/STORE.md`: hay que crear la cuenta de Google de `tech@`) | Aún se instala a mano desde el zip: subir `version` en `manifest.json` con cada cambio que deba llegar a la gente. Los textos en `_locales/{en,es}` |
| Conector MCP | Servidor MCP y OAuth 2.1 propios, sin SDK | `lib/mcp/`, `app/mcp`, `app/api/mcp/`, `/.well-known/` | Con la app | `npm run check:mcp` recorre el flujo entero. → [Desarrollo](desarrollo.md#conector-mcp) |
| Comentarios sobre la app | **Agentation** (barra de anotaciones) | `components/FeedbackTool.tsx`, `lib/feedback.ts`, `/api/feedback`; se guarda en `feedback_note` y se envía por correo | Con la app | Solo para quien tiene sesión; límite de 10 envíos por hora y persona |
| Código | **GitHub**, `ericruizmolero/inspo`, rama `main` | Ship Studio como entorno de trabajo (`.claude/launch.json`, preview en localhost) | Cuenta de Eric; los socios colaboran por PR e issues | CI en GitHub Actions (`.github/workflows/ci.yml`) en cada PR y push a `main`: tipos, build y los `check:*` que no piden servidor ni datos reales. Será obligatoria cuando un admin del repo exija sus jobs en `main`. La fusión la hace una persona |

Terceros que carga el navegador sin pasar por nosotros: el icono de una web viene del servicio de favicons de Google (`s2`). La tipografía de la app (Satoshi) la descarga de Fontshare `scripts/fetch-fonts.mjs` antes del build, sin pasar por git por su licencia, y se sirve desde nuestro origen con `next/font/local`; las de las referencias pasan por `/api/system/font` (`lib/ref-fonts.ts`, `lib/font-proxy.ts`).

## Modelos

Todos por OpenRouter. Cada tarea tiene una fila en `lib/prompts.ts` (modelo, reserva, esfuerzo, tokens, versión e idioma) y su propia variable de modelo, sin cadenas: cambiar una no toca otra. El prompt cambia subiendo su `version` en esa tabla. Para el sistema y la marca, antes de cambiar ninguno de los dos, `npm run eval:system` (→ [Desarrollo](desarrollo.md#ia)).

| Acción | Variable | Por defecto | Dónde |
| --- | --- | --- | --- |
| Etiquetar una referencia (visión) | `TAG_MODEL` | `google/gemini-2.5-flash-lite` | `lib/tagger.ts` |
| Reserva de las etiquetas: cada llamada que falla y el último intento de un trabajo | `TAG_FALLBACK_MODEL` | `mistralai/mistral-small-3.2-24b-instruct` | `lib/tagger.ts` |
| Leer el tablero en el sistema | `SYSTEM_MODEL` | `deepseek/deepseek-v4.1-flash` | `lib/system.ts` |
| Otras opciones para un área | `OPTIONS_MODEL` | `deepseek/deepseek-v4.1-flash` | `lib/system.ts` |
| Curar la evidencia de un área | `CURATE_MODEL` | `deepseek/deepseek-v4.1-flash` | `lib/system.ts` |
| Repartir la bandeja en proyectos | `TRIAGE_MODEL` | `deepseek/deepseek-v4.1-flash` | `lib/system.ts` |
| Arranque de un área vacía | `START_MODEL` | `anthropic/claude-haiku-4.5` | `lib/system.ts` |
| Valores de la marca | `BRAND_MODEL` | `deepseek/deepseek-v4.1-flash` | `lib/brand.ts` |
| Plan del agente | `AGENT_MODEL` | `deepseek/deepseek-v4.1-flash` | `lib/agent.ts` |
| DESIGN.md de una web (lo pide la importación de marca) | `DESIGN_MD_MODEL` | `deepseek/deepseek-v4.1-flash` | `lib/design-md.ts` |
| Reserva de cualquier llamada que falla (la de etiquetas tiene la suya) | `LLM_FALLBACK_MODEL` | `anthropic/claude-haiku-5.5` | `lib/llm.ts` |
| Juez de las evals (script) | `EVAL_JUDGE_MODEL` | `anthropic/claude-sonnet-5.5` | `scripts/eval-system.ts`, `scripts/eval-criterio.ts` |
| Vectores de búsqueda | `EMBED_MODEL` | `baai/bge-m3` | `lib/embed.ts` |
| Prototipo del loop (scripts, fuera de la app) | `LOOP_CHEAP_MODEL`, `LOOP_SMART_MODEL` | DeepSeek, Sonnet | `scripts/loop/` |

Lo que cuesta cada acción y cómo cuenta en la cuota está en [Desarrollo](desarrollo.md#ia) y en la decisión [el plan cuenta acciones de IA](decisiones/2026-10-06-el-plan-cuenta-acciones-de-ia.md).

## Librerías de la app

| Librería | Para qué | Dónde |
| --- | --- | --- |
| Next.js 16 (App Router), React 19, TypeScript 5 | La app entera. Leer `node_modules/next/dist/docs/` antes de tocar nada de Next: esta versión no es la de la memoria | `app/`, `proxy.ts`, `instrumentation.ts` |
| React Compiler (`babel-plugin-react-compiler`) | Memoiza en el build: no hace falta `useMemo` ni `useCallback` a mano | `reactCompiler` en `next.config.ts` |
| Tailwind 4 con CSS propio y tokens | Los tokens en `app/globals.css` mandan; Tailwind para utilidades | [Tokens](fundamentos.md) |
| shadcn (`base-nova`) sobre Base UI, Phosphor | Piezas base (`components/ui/`) y todos los iconos (`@phosphor-icons/react/ssr`) | `components.json` |
| cmdk | La paleta de comandos | `components/ui/command.tsx` |
| class-variance-authority, clsx, tailwind-merge | Variantes y unión de clases | `components/ui/` |
| zod 4 | El contrato de salida de cada modelo y de las herramientas MCP | `lib/llm.ts`, `lib/tagger.ts`, `lib/system.ts`, `lib/mcp/tools.ts` |
| drizzle-orm 0.45 y `pg` | Consultas y migraciones | `lib/db/` |
| @aws-sdk/client-s3 y s3-request-presigner | R2 | `lib/storage.ts` |
| undici | `safeFetch`: salir a la red sin tocar la red propia | `lib/safe-fetch.ts` |
| puppeteer-core y @sparticuz/chromium | Capturas y sondas | `lib/screenshot.ts` |
| sharp | Recortar y convertir imágenes del sistema y del zip de marca | `lib/brand-files.ts`, `lib/brand-zip.ts` |
| cuelume | Sonidos de la interfaz, siempre a través de `lib/ui-sounds.ts` | [Patrones](patrones.md#sonido) |
| agentation | La barra de comentarios sobre la app | `components/FeedbackTool.tsx` |
| @typesafe-ai/sdk | Jev | `lib/jev.ts` |
| better-auth | Identidad y espacios | `lib/auth.ts` |
| WAAPI y CSS | Todo el movimiento. GSAP se retiró el 2026-10-05 y no vuelve sin decisión | [Movimiento](fundamentos/movimiento.md) |
| tsx, dotenv | Los scripts de `scripts/` | `package.json` |
| vitest | Los tests (`npm test`): la suite de aislamiento entre equipos | `vitest.config.mts`, `tests/` |
| papaparse, @vercel/blob, @libsql/client | Solo en scripts de migración de la etapa anterior (Google Sheet, Vercel Blob, Turso). No usar en la app | `lib/sheets.ts`, `scripts/move-blob-to-r2.ts`, `scripts/copy-turso.ts` |
| exifr, tw-animate-css | Están en `package.json` y nadie los importa: candidatos a salir | |

## Variables de entorno

Las de producción viven en Vercel (Settings, Environment Variables; `vercel env ls` las lista). Casi todas están marcadas como sensibles: no se pueden leer de vuelta, ni con `vercel env pull`. Las que necesita el local están en [Montar el proyecto](construir/montar.md).

| Grupo | Variables | Quién las pone |
| --- | --- | --- |
| Base de datos | `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (las migraciones usan la directa), `PG*`, `POSTGRES_*`, `NEON_PROJECT_ID` | La integración de Neon en producción; a mano en preview, con la rama `preview` |
| Ficheros | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (`R2_ENDPOINT` opcional) | A mano, producción y preview |
| Identidad | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (la pública, `https://criterio.design`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | A mano. `APPLE_*` y `TWITTER_*` no están puestas |
| Correo | `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` | A mano |
| IA | `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`, `TYPESAFE_BASE_URL`, y las de modelos de la tabla de arriba | A mano. `ANTHROPIC_API_KEY` está en Vercel pero ningún fichero la lee: todo va por OpenRouter |
| Tareas y acceso | `CRON_SECRET`, `ADMIN_EMAILS` (los socios también se dan de alta con `npm run admin -- <correo>`, tabla `app_admin`) | A mano |
| Solo local | `DEV_LOGIN_EMAIL`, `PULL_DATABASE_URL`, `CHROME_EXECUTABLE_PATH`, `CHROME_CONCURRENCY`, `SHOT_DIR` | Cada persona en su `.env.local` |

`.env*` y `prod.env` están en `.gitignore`: nunca van al repositorio.

## Dependencias y versiones

- No hay bot de dependencias. Revisar a mano con `npm outdated` y `npm audit --omit=dev`. Estado el 2026-10-07: 4 avisos moderados, todos de `esbuild` 0.24 por una dependencia transitiva, sin arreglo que no sea `--force`.
- Antes de subir Next: leer `node_modules/next/dist/docs/` y los avisos de deprecación, luego `npm run build`.
- Una librería nueva de interfaz necesita decisión: la última que entró con decisión fue cuelume, y la última que salió, GSAP.
- Rotar una clave: crear la nueva, cambiarla en Vercel, redesplegar, borrar la vieja. Para cortar el acceso de solo lectura a la BD de alguien: cambiar la contraseña del rol `dev_readonly` en Neon.

## Quién tiene qué

Tres socios (Eric, Andoni, Alberto); el reparto va por issues de GitHub. Cuentas: Vercel y Resend bajo `tech@criterio.design`; el dominio y el proxy `web-proxy`, en cuentas personales de Eric; Cloudflare, Neon, OpenRouter y Typesafe, pendiente de apuntar aquí bajo qué cuenta están. Las credenciales que se pasan entre socios (llave de R2 de solo lectura, `PULL_DATABASE_URL`) van por un canal privado, nunca por un chat compartido.
