# Seguridad y políticas

Todo lo que protege la app y lo que prometemos en público, en un sitio. Cada regla dice dónde está en el código para que un cambio no la rompa sin querer. Qué servicio es cada pieza está en [Stack tecnológico](stack.md).

## Quién entra y a qué

- **Sin cookie de sesión no se entra.** `proxy.ts` corre antes de cada petición y solo deja pasar sin sesión lo que está en su lista `PUBLIC`: `/`, `/login`, `/api/auth`, `/invite/`, `/unsubscribe`, `/api/unsubscribe`, `/s/`, `/extension/download` (el zip de la extensión, el mismo código que el repo público y sin ninguna llave; lo ofrece `criterio.design/extension/`), `/api/ext/`, `/api/cron/`, `/api/queue/` (las entregas de Vercel Queues; esas rutas no tienen URL pública), `/api/health` (las comprobaciones de Better Stack: dicen ok, tiempos y cuántos trabajos esperan), `/mcp`, `/api/mcp/` y `/.well-known/`. Todo lo demás va a `/login`.
- **El permiso real lo comprueba cada página y cada ruta**: espacio, rol (`owner` y `admin` gestionan; `member` añade) y socio. `requireCtx` en `lib/workspace.ts`. El proxy solo es el "no" rápido.
- **Sin contraseñas.** Se entra con enlace mágico (caduca a los 10 minutos) o con Google. La sesión dura 30 días y se renueva cada día; la cookie se cachea 5 minutos (`lib/auth.ts`).
- **Las páginas internas** (`/admin`, `/library`) responden 404 a quien no es socio. Socio = correo en `ADMIN_EMAILS` o fila en `app_admin` (`npm run admin -- <correo>`).
- **El acceso automático de desarrollo** (`DEV_LOGIN_EMAIL`, `/api/dev-login`) se ignora en producción por código, no por configuración.

## Credenciales que no son una sesión

| Quién | Cómo entra | Dónde | Qué guarda la BD |
| --- | --- | --- | --- |
| La extensión | `Authorization: Bearer crit_…`, una llave por conexión que se enseña una sola vez | `lib/ext-keys.ts`, `app/api/ext/v1/` | Solo el SHA-256. Actúa por la persona en todos sus espacios hasta que se revoca |
| Un cliente de IA (MCP) | OAuth 2.1 propio: registro dinámico, código con PKCE S256, token de acceso de una hora y de refresco de 60 días rotado en cada uso. Ni implícito ni contraseña | `lib/mcp/oauth.ts`, `lib/mcp/auth.ts`, permiso en `/mcp/authorize` (pide sesión) | Solo el hash, en `mcp_client` y `mcp_grant` |
| El cron de Vercel | `CRON_SECRET` como bearer; sin la variable, nada entra | `lib/cron-auth.ts` | |
| El enlace de baja de un correo | HMAC con `BETTER_AUTH_SECRET` sobre persona y tipo; solo apaga, nunca lee ni enseña nada | `lib/notify.ts` | Sin la variable, producción no arranca ese código |
| Quien tiene un enlace compartido | El token en la ruta `/s/<token>` es la prueba; solo lectura, sin indexar | `lib/share.ts`, tabla `system_share` | El token (aleatorio) |

## Límites de uso

- Better Auth limita a 100 peticiones por minuto, contadas en Postgres (`rate_limit`) para que todas las instancias sumen. Solo en producción.
- Los nuestros usan la misma tabla con claves `app:` (`allow()` en `lib/rate-limit.ts`): 5 enlaces mágicos por hora y dirección, 10 comentarios por hora y persona, 60 capturas cada 10 minutos por espacio.
- La extensión (`requireExtCtx` en `lib/ext-keys.ts`, todas las rutas de `/api/ext/v1`): 120 peticiones por minuto por llave, 300 por espacio sumando las llaves de todos sus miembros, y 30 lotes de importación por minuto por espacio. Pasado el límite responde 429 con `Retry-After: 60`, y la página de importar espera y manda el mismo lote otra vez.
- El MCP: 120 peticiones por minuto por persona en `/mcp`, con cualquier token (429), y 40 escrituras por minuto, que se le dicen al modelo como error de la herramienta para que espere. Antes era un contador en memoria que cada instancia llevaba por su cuenta.
- El OAuth del MCP, por IP (`ipOf()`, la primera de `x-forwarded-for`): 60 registros de cliente por hora en `/api/mcp/register` y 120 peticiones por minuto en `/api/mcp/token`. Claude.ai registra desde sus servidores, así que una IP puede ser mucha gente: subirlo antes de que les cierre la puerta.
- `tests/rate-limits.test.ts` golpea cada una de estas rutas desde dos instancias a la vez y comprueba el 429 justo después del límite. → [límites por minuto](decisiones/2026-10-10-la-extension-el-mcp-y-su-oauth-tienen-limite-por-minuto-en-postgres.md)
- Cada intento de entrada fallido queda en el log como `login_failed` con ruta, motivo e IP.
- La cuota del plan cuenta acciones de IA por mes y por cuenta de facturación, sumando todos sus espacios (`assertQuota` antes de cada llamada a un modelo, `recordUsage` después). → [un plan, varios espacios](decisiones/2026-10-10-un-plan-paga-varios-espacios.md) → [cifras de 13-10](decisiones/2026-10-13-todos-los-planes-invitan-y-el-gratis-es-un-proyecto-de-12-referencias.md) → [el plan cuenta acciones de IA](decisiones/2026-10-06-el-plan-cuenta-acciones-de-ia.md)
- El plan gratis guarda 1 proyecto, 12 referencias y 1 GB por espacio (`assertProjectRoom`, `assertRoom`, 402 en cada camino que crea o guarda), y crear un equipo pide pagar un plan: ser dueño (`billing_account.owner_user_id`) de una cuenta de pago (`beforeCreateOrganization`). Un workspace gratis por persona. → [decisión](decisiones/2026-10-10-el-plan-gratis-guarda-200-referencias-1-gb-y-un-workspace.md) → [un plan, varios espacios](decisiones/2026-10-10-un-plan-paga-varios-espacios.md)

## Cabeceras

- **CSP con nonce en cada página** (`proxy.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'self'`. Un script inyectado no tiene nonce y no corre. Nuestro único script inline (el tema, en `app/layout.tsx`) lleva el nonce que llega en `x-nonce`. Nunca `onerror=` ni manejadores en HTML, tampoco dentro de un `srcDoc`. Esta cabecera sustituye a la de `next.config.ts`, así que lleva también `frame-ancestors`.
- **Nadie puede enmarcar la app** (`frame-ancestors 'self'`, `X-Frame-Options SAMEORIGIN`), y la pantalla de permiso del MCP (`/mcp/authorize`) ni siquiera nosotros (`'none'`, `DENY`): un clic en "Permitir" no se puede dirigir desde fuera.
- En cada respuesta (`next.config.ts`): HSTS de dos años con `preload`, `nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` sin cámara, micrófono, posición ni pago. Sin cabecera `X-Powered-By`.
- En desarrollo la CSP admite `'unsafe-eval'` (React reconstruye los errores del servidor con eval). Solo ahí.

## Salir a la red

Lo más delicado: la app descarga lo que una persona le pide (una web, una imagen, una fuente) y lanza Chromium contra ella.

- **`safeFetch`** (`lib/safe-fetch.ts`, sobre undici) resuelve el nombre, comprueba cada dirección, sigue las redirecciones a mano y abre el socket a la dirección recién comprobada: un nombre que responde público a la comprobación y privado a la conexión (DNS rebinding) no llega a nada. `isPublicHttpUrl` (`lib/extract.ts`) es el "no" barato de antes.
- **Chromium solo sale por `lib/egress-proxy.ts`**, un proxy HTTP dentro del proceso que resuelve y comprueba cada host; Chromium nunca resuelve nombres por su cuenta.
- **Un Chromium a la vez** (`lib/browser.ts`): cada uno pesa de 300 a 500 MB; la cola rechaza en vez de esperar minutos.
- **Tamaños con tope**: imagen de `/api/og` 8 MB, fuente 4 MB, imagen subida 20 MB, vídeo 60 MB (80 MB para Screen Studio). Las subidas grandes van del navegador a R2 por URL firmada, sin pasar por una función.
- El proxy externo `web-proxy` lee webs que bloquean IPs de centros de datos; `WEB_PROXY_URL=""` lo apaga.

## Lo que servimos de otros

- Un fichero ajeno que sale por nuestro origen (`/api/og`, las fuentes en `lib/font-proxy.ts`) va con un tipo fijo (imagen rasterizada o fuente), `nosniff` y `Content-Security-Policy: default-src 'none'; sandbox`: un SVG o un HTML de otro en criterio.design correría con la sesión de quien lo abre.
- Los ficheros de un espacio (`/api/files/inspo/<ws>/…`) se sirven a cualquier miembro de ese espacio, no solo al que lo tiene activo en la sesión; con R2 la ruta redirige a una URL firmada que dura una hora. Las imágenes del tablero no pasan por ella: la página de la biblioteca y el pulso traen en `signed` los enlaces firmados de las miniaturas, las imágenes subidas y el DESIGN.md de sus propias filas, válidos una hora o más, y la ruta queda como reserva. → [decisión](decisiones/2026-10-10-las-imagenes-del-tablero-llegan-firmadas.md)
- El criterio.md que sale de la app sin sesión (el MCP, el zip de la marca) enlaza sus archivos con `/api/files/~<último día>.<firma>/<clave>` (`lib/file-links.ts`; la firma va en la ruta porque el lector de claude.ai pierde la query, y los enlaces de antes con `?t=` siguen abriendo): una firma HMAC de esa clave y ese día, válida 30 días y la misma dirección todo el día. La ruta la acepta en lugar de la sesión, solo para esa clave; `proxy.ts` deja pasar sin cookie las peticiones a `/api/files/~…` y a `/api/files/` con `t` y la ruta comprueba la firma. Con firma, la ruta sirve los bytes ella misma en vez de redirigir a R2 (un lector no sigue una redirección a otro dominio, y una lista de dominios permitidos necesita solo `app.criterio.design`), con `Vary: User-Agent` y `X-Robots-Tag: noindex`. `robots.txt` deja entrar en `/api/files/` (los lectores de IA lo respetan; sin firma la ruta sigue en 401). El lector de claude.ai (`Claude-User`) solo pasa texto al modelo: una imagen, o un PDF de ella, le llega vacía (probado el 13/10/2026 en claude.ai, con el log `files.outside`). A él la misma dirección le da la imagen en palabras (`lib/file-text.ts`): su nombre, lo que la IA vio en ella, los colores de sus píxeles y su estilo. Así el enlace abre en un navegador, en un visor de Markdown, en una terminal, en el lector de claude.ai y en cualquier herramienta que descargue; solo una red que bloquee el dominio (la lista de dominios del terminal de claude.ai) necesita `app.criterio.design` en su lista. Sin ella, Claude y cualquier cliente de fuera recibían 401 en cada imagen. La copia que se copia o descarga desde la app (`components/SystemView.tsx`) la monta el navegador, que no puede firmar: `/api/system/measured` le da en `links` el enlace firmado de cada archivo que el fichero cita. Un criterio.md se puede compartir en público: quien tenga el enlace ve la imagen.
- Además, `read_reference` del MCP manda la imagen de la referencia dentro de la respuesta, como bloque de imagen (`lib/mcp/pieces.ts`): la copia de tablero de 720 px, la miniatura elegida o el principio de la captura de la página. `robots.txt` no cambia.
- Una web solo se enseña como imagen (captura guardada), nunca se renderiza en vivo: la vista "En vivo" con iframe se retiró el 2026-10-06 por seguridad. → [Mapa](mapa.md)

## Datos

- Todo pertenece a un espacio (`workspace`), y las consultas filtran por él. La propiedad de una tarjeta es `createdBy`, nunca el nombre de quien la guardó.
- Borrar en cascada: al borrar una referencia se van sus ficheros, su hilo y sus votos (`npm run check:postgres` lo comprueba).
- Borrar un equipo (solo su propietario, escribiendo el nombre) se lleva todas sus filas, sus lápidas, sus avisos y contadores con el id en la clave, y sus ficheros bajo `inspo/<ws>/` e `inspo/design-why/<ws>/` (`deleteWorkspace`, `lib/workspace-delete.ts`). El espacio personal no se borra. El gasto de IA se queda para la contabilidad, sin espacio y con su nombre. El endpoint de borrar de Better Auth está apagado. `npm run check:workspace-delete` comprueba que no queda nada. → [decisión](decisiones/2026-10-10-borrar-un-espacio-no-deja-nada-y-exportarlo-es-un-json.md)
- Exportar un espacio: su propietario baja un JSON con fichas, proyectos, sistema, comentarios, revisiones, miembros (con su correo) y gasto de IA (`GET /api/workspace/export`, `lib/workspace-export.ts`). Sin tokens de enlaces compartidos ni hashes de llaves.
- Lo que viene de X, Pinterest, Are.na o Cosmos (`staysInside`, `lib/url.ts`: un post, o una imagen, vídeo o texto cuya página está en una de esas plataformas) no se enseña sin sesión; cada copia guarda su página en `inspo_item.source` y todo lo que la cita enlaza al original. → [decisión](decisiones/2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md)
- Una petición de retirada se ejecuta con `npm run takedown <url>` (sin `--apply` solo lista; `--prod --apply` toca producción) y borra la referencia y sus copias en todos los espacios.
- Las claves de la BD de producción, la de escritura de R2 y la de Resend nunca van en un `.env.local`: la app local escribiría en producción. Las credenciales entre socios van por canal privado. `.env*` y `prod.env` están en `.gitignore`.
- Un informe de error (Better Stack, `lib/error-reports.ts`) no lleva quién es la persona ni lo que escribió: se quitan el cuerpo de la petición (feedback, notas, comentarios), cookies, cabeceras, la query y los mensajes de consola, y cualquier correo o firma de URL de R2 que quede se tapa. Un dato nuevo que pueda acabar en un error pasa por ahí.
- Los logs y la tabla `failure` (`lib/log.ts`) siguen la misma regla: `userId` y `organizationId`, nunca un correo, ni el texto de una nota, un comentario, un feedback o un prompt. `failure` guarda 30 días (el cron `morning` borra lo anterior) y solo la ven los socios en `/admin/failures`.
- Lo que se manda a un modelo: la captura y el texto de una web para etiquetarla, las notas y el hilo de un proyecto para su sistema. Ningún proveedor entrena con ello (es lo que promete la política de privacidad, y la lista de proveedores de `marketing-site/src/legal.ts` tiene que coincidir con el [stack](stack.md)).

## La extensión

- Permisos del manifiesto: `storage`, `activeTab`, `bookmarks`, `contextMenus`, `scripting`; hosts fijos `app.criterio.design` y `localhost`; `x.com` y `pinterest.com` solo como opcionales, que la persona concede al importar.
- No usa la cookie de la web: su llave `crit_…` vive en `chrome.storage.local`.
- Su política está en `criterio.design/extension/privacy/` (la web de marketing), enlazada desde la ficha de la tienda y desde `/extension/`; la dirección antigua de la app redirige allí.

## Políticas públicas

| Página | Qué cubre | Dónde |
| --- | --- | --- |
| `/privacy/` | Quién responde, qué recogemos (cuenta, sesiones con IP, lo guardado, uso, IA, comentarios), para qué y con qué base, IA sin entrenamiento, proveedores (Vercel, Neon, Cloudflare, Resend, OpenRouter, Typesafe, Google, Apple y X), transferencias fuera del EEE, cookies solo funcionales, conservación, derechos y AEPD, mayores de 16, cambios | `marketing-site/src/components/LegalPage.astro`, textos y datos de la sociedad en `marketing-site/src/legal.ts` |
| `/terms/` | Quiénes somos, el servicio, cuenta y equipo, lo tuyo y lo de otros, importar de otros servicios (sin afiliación con X ni Pinterest), lo prohibido (ilegal, recogida masiva, saltarse planes, forzar la entrada), cómo pedir una retirada, planes y pago (los de pago aún no se cobran; cuando se cobren: EUR o USD más IVA, con IVA español, inversión del sujeto pasivo, OSS o sin IVA según quién paga; mensual o anual, renovación, cancelación al final del periodo pagado sin reembolso del anual, desistimiento de 14 días; precio de fundador; uso justo de las búsquedas sin cifra; topes del gratis, que salen de `PLANS`, y qué pasa con lo guardado al bajar o cancelar), disponibilidad, cerrar la cuenta, responsabilidad, ley española, cambios | Igual |
| `/extension/privacy/` | Lo que la extensión manda (dirección, título, captura de lo visible) y lo que no hace | Igual |

- Están en producción desde el 2026-10-07 y el login las enlaza siempre. → [decisión](decisiones/2026-10-07-el-login-es-plano-y-enlaza-siempre-a-terminos-y-privacidad.md)
- Viven en la web de marketing (`criterio.design`, en inglés y bajo `/es/` en castellano); la app redirige sus direcciones antiguas y el login enlaza allí en el idioma de quien lee. → [decisión](decisiones/2026-10-11-las-paginas-legales-y-los-recursos-viven-en-la-web-de-marketing.md)
- Las firma treseiscero, NIF E75239277, con domicilio en Hondarribia (Gipuzkoa): `LEGAL` en `marketing-site/src/legal.ts`, que no lleva DNI ni teléfono de nadie. Contacto: `hola@criterio.design`. Al cambiar un texto, cambiar `LEGAL_UPDATED`.
- Sin analítica de terceros ni anuncios: las únicas cookies son la sesión, el idioma (`lang`) y el estado del menú. El tema va en `localStorage`.
- Un proveedor nuevo en el stack es también una línea nueva en "Con quién lo compartimos" de la política de privacidad, en los dos idiomas, en el mismo trabajo.

## Pendiente

- Que un abogado revise los textos.
- Confirmar tres reglas de "Planes y pago" que se escribieron por defecto, sin decidir (#97): el anual cancelado sigue hasta el final del año pagado sin reembolso de lo que queda; el mensual acaba al final del mes; el desistimiento de 14 días termina cuando el servicio empieza con el consentimiento expreso de quien compra.
- Apuntar bajo qué cuenta están Cloudflare, Neon, OpenRouter y Typesafe; mover `web-proxy` al equipo de Vercel.
- Better Stack: la página de estado pública, y apuntar quién tiene la cuenta. Los errores de Better Stack están en la región de EE. UU. (`us-west-2a`); el resto de los datos, en Fráncfort.
- `ANTHROPIC_API_KEY` en Vercel sin uso: borrarla o usarla.
- Vercel en Hobby y Neon en Free: cambiar antes del primer cobro.
- La política de privacidad no dice todavía que el gasto de IA de un equipo borrado se guarda, con su nombre, para la contabilidad, ni cómo se exporta un espacio.
