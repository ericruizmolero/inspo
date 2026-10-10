# Seguridad y políticas

Todo lo que protege la app y lo que prometemos en público, en un sitio. Cada regla dice dónde está en el código para que un cambio no la rompa sin querer. Qué servicio es cada pieza está en [Stack tecnológico](stack.md).

## Quién entra y a qué

- **Sin cookie de sesión no se entra.** `proxy.ts` corre antes de cada petición y solo deja pasar sin sesión lo que está en su lista `PUBLIC`: `/`, `/login`, `/api/auth`, `/invite/`, `/privacy`, `/terms`, `/unsubscribe`, `/api/unsubscribe`, `/extension/privacy`, `/s/`, `/api/ext/`, `/api/cron/`, `/api/health` (las comprobaciones de Better Stack: solo dicen ok y tiempos), `/mcp`, `/api/mcp/` y `/.well-known/`. Todo lo demás va a `/login`.
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
- Cada intento de entrada fallido queda en el log como `login_failed` con ruta, motivo e IP.
- La cuota del plan cuenta acciones de IA por mes (`assertQuota` antes de cada llamada a un modelo, `recordUsage` después). → [el plan cuenta acciones de IA](decisiones/2026-10-06-el-plan-cuenta-acciones-de-ia.md)

## Cabeceras

- **CSP con nonce en cada página** (`proxy.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'; object-src 'none'; base-uri 'self'`. Un script inyectado no tiene nonce y no corre. Nuestro único script inline (el tema, en `app/layout.tsx`) lleva el nonce que llega en `x-nonce`. Nunca `onerror=` ni manejadores en HTML, tampoco dentro de un `srcDoc`. Esta cabecera sustituye a la de `next.config.ts`, así que lleva también `frame-ancestors`.
- **Nadie puede enmarcar la app** (`frame-ancestors 'self'`, `X-Frame-Options SAMEORIGIN`), y la pantalla de permiso del MCP (`/mcp/authorize`) ni siquiera nosotros (`'none'`, `DENY`): un clic en "Permitir" no se puede dirigir desde fuera.
- En cada respuesta (`next.config.ts`): HSTS de dos años con `preload`, `nosniff`, `Referrer-Policy strict-origin-when-cross-origin`, `Permissions-Policy` sin cámara, micrófono, posición ni pago. Sin cabecera `X-Powered-By`.
- En desarrollo la CSP admite `'unsafe-eval'` (React reconstruye los errores del servidor con eval). Solo ahí.

## Salir a la red

Lo más delicado: la app descarga lo que una persona le pide (una web, una imagen, una fuente) y lanza Chromium contra ella.

- **`safeFetch`** (`lib/safe-fetch.ts`, sobre undici) resuelve el nombre, comprueba cada dirección, sigue las redirecciones a mano y abre el socket a la dirección recién comprobada: un nombre que responde público a la comprobación y privado a la conexión (DNS rebinding) no llega a nada. `isPublicHttpUrl` (`lib/extract.ts`) es el "no" barato de antes.
- **Chromium solo sale por `lib/egress-proxy.ts`**, un proxy HTTP dentro del proceso que resuelve y comprueba cada host; Chromium nunca resuelve nombres por su cuenta.
- **Un Chromium a la vez** (`lib/browser-gate.ts`): cada uno pesa de 300 a 500 MB; la cola rechaza en vez de esperar minutos.
- **Tamaños con tope**: imagen de `/api/og` 8 MB, fuente 4 MB, imagen subida 20 MB, vídeo 60 MB (80 MB para Screen Studio). Las subidas grandes van del navegador a R2 por URL firmada, sin pasar por una función.
- El proxy externo `web-proxy` lee webs que bloquean IPs de centros de datos; `WEB_PROXY_URL=""` lo apaga.

## Lo que servimos de otros

- Un fichero ajeno que sale por nuestro origen (`/api/og`, las fuentes en `lib/font-proxy.ts`) va con un tipo fijo (imagen rasterizada o fuente), `nosniff` y `Content-Security-Policy: default-src 'none'; sandbox`: un SVG o un HTML de otro en criterio.design correría con la sesión de quien lo abre.
- Los ficheros de un espacio (`/api/files/inspo/<ws>/…`) se sirven a cualquier miembro de ese espacio, no solo al que lo tiene activo en la sesión; con R2 la ruta redirige a una URL firmada que dura una hora.
- Una web solo se enseña como imagen (captura guardada), nunca se renderiza en vivo: la vista "En vivo" con iframe se retiró el 2026-10-06 por seguridad. → [Mapa](mapa.md)

## Datos

- Todo pertenece a un espacio (`workspace`), y las consultas filtran por él. La propiedad de una tarjeta es `createdBy`, nunca el nombre de quien la guardó.
- Borrar en cascada: al borrar una referencia se van sus ficheros, su hilo y sus votos (`npm run check:postgres` lo comprueba).
- Lo que viene de X, Pinterest, Are.na o Cosmos (`staysInside`, `lib/url.ts`: un post, o una imagen, vídeo o texto cuya página está en una de esas plataformas) no se enseña sin sesión; cada copia guarda su página en `inspo_item.source` y todo lo que la cita enlaza al original. → [decisión](decisiones/2026-10-06-lo-importado-de-x-y-pinterest-no-sale-del-espacio.md)
- Una petición de retirada se ejecuta con `npm run takedown <url>` (sin `--apply` solo lista; `--prod --apply` toca producción) y borra la referencia y sus copias en todos los espacios.
- Las claves de la BD de producción, la de escritura de R2 y la de Resend nunca van en un `.env.local`: la app local escribiría en producción. Las credenciales entre socios van por canal privado. `.env*` y `prod.env` están en `.gitignore`.
- Un informe de error (Better Stack, `lib/error-reports.ts`) no lleva quién es la persona ni lo que escribió: se quitan el cuerpo de la petición (feedback, notas, comentarios), cookies, cabeceras, la query y los mensajes de consola, y cualquier correo o firma de URL de R2 que quede se tapa. Un dato nuevo que pueda acabar en un error pasa por ahí.
- Los logs y la tabla `failure` (`lib/log.ts`) siguen la misma regla: `userId` y `organizationId`, nunca un correo, ni el texto de una nota, un comentario, un feedback o un prompt. `failure` guarda 30 días (el cron `morning` borra lo anterior) y solo la ven los socios en `/admin/failures`.
- Lo que se manda a un modelo: la captura y el texto de una web para etiquetarla, las notas y el hilo de un proyecto para su sistema. Ningún proveedor entrena con ello (es lo que promete la política de privacidad, y la lista de proveedores de `lib/i18n/<locale>/legal.ts` tiene que coincidir con el [stack](stack.md)).

## La extensión

- Permisos del manifiesto: `storage`, `activeTab`, `bookmarks`, `contextMenus`, `scripting`; hosts fijos `criterio.design` y `localhost`; `x.com` y `pinterest.com` solo como opcionales, que la persona concede al importar.
- No usa la cookie de la web: su llave `crit_…` vive en `chrome.storage.local`.
- Su política está en `/extension/privacy`, enlazada desde la ficha de la tienda.

## Políticas públicas

| Página | Qué cubre | Dónde |
| --- | --- | --- |
| `/privacy` | Quién responde, qué recogemos (cuenta, sesiones con IP, lo guardado, uso, IA, comentarios), para qué y con qué base, IA sin entrenamiento, proveedores (Vercel, Neon, Cloudflare, Resend, OpenRouter, Typesafe, Google, Apple y X), transferencias fuera del EEE, cookies solo funcionales, conservación, derechos y AEPD, mayores de 16, cambios | `components/LegalDoc.tsx`, textos en `lib/i18n/{en,es}/legal.ts` |
| `/terms` | Quiénes somos, el servicio, cuenta y equipo, lo tuyo y lo de otros, importar de otros servicios (sin afiliación con X ni Pinterest), lo prohibido (ilegal, recogida masiva, saltarse planes, forzar la entrada), cómo pedir una retirada, planes (los de pago aún no se cobran), disponibilidad, cerrar la cuenta, responsabilidad, ley española, cambios | Igual |
| `/extension/privacy` | Lo que la extensión manda (dirección, título, captura de lo visible) y lo que no hace | `app/extension/privacy` |

- Están en producción desde el 2026-10-07 y el login las enlaza siempre. → [decisión](decisiones/2026-10-07-el-login-es-plano-y-enlaza-siempre-a-terminos-y-privacidad.md)
- Son **borrador** hasta que `lib/legal.ts` tenga razón social, NIF y domicilio (`LEGAL`); mientras tanto los huecos se nombran como pendientes y hay aviso de borrador. Contacto: `hola@criterio.design`. Al cambiar un texto, cambiar `LEGAL_UPDATED`.
- Sin analítica de terceros ni anuncios: las únicas cookies son la sesión, el idioma (`lang`) y el estado del menú. El tema va en `localStorage`.
- Un proveedor nuevo en el stack es también una línea nueva en "Con quién lo compartimos" de la política de privacidad, en los dos idiomas, en el mismo trabajo.

## Pendiente

- Rellenar `LEGAL` y que lo revise un abogado.
- Apuntar bajo qué cuenta están Cloudflare, Neon, OpenRouter y Typesafe; mover `web-proxy` al equipo de Vercel.
- Better Stack: crear la cuenta, poner `NEXT_PUBLIC_BETTERSTACK_DSN` y `BETTERSTACK_HEARTBEAT_URL` en Vercel, los monitores y la página de estado.
- `ANTHROPIC_API_KEY` en Vercel sin uso: borrarla o usarla.
- Vercel en Hobby y Neon en Free: cambiar antes del primer cobro.
