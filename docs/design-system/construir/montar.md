# Montar el proyecto

Cómo pasar de cero a la app corriendo en local con una copia de los datos reales. La versión larga, en inglés, está en el `README.md` de la raíz; aquí va lo esencial y las trampas que ya nos han mordido.

## Pasos

1. **Herramientas.** Node 22+, Google Chrome (la app lo usa para capturas) y Postgres local: DBngin con PostgreSQL 18 en el puerto `5432`. TablePlus si quieres mirar dentro (host `127.0.0.1`, usuario `postgres`, sin contraseña, base `criterio`).
2. **Dos credenciales por canal privado** (AirDrop, 1Password, nunca un chat compartido): `PULL_DATABASE_URL` (Neon de solo lectura) y una clave de R2 de solo lectura para `criterio-files`.
3. **Datos.** `npm install` y `npm run db:pull`: crea la base `criterio`, migra y copia producción. Solo escribe en una base local.
4. **Ficheros.** `npm run files:pull` con la clave de R2 en el propio comando, no en `.env.local`. Repetir tras cada `db:pull`.
5. **Arrancar.** `npm run dev`. Con `DEV_LOGIN_EMAIL` en `.env.local` entras por `/api/dev-login` sin correo.

## Lo que nunca va en `.env.local`

| Variable | Por qué |
| --- | --- |
| `DATABASE_URL` y demás de Neon | Tu app local escribiría en producción |
| `R2_*` con permiso de escritura | Borrar una miniatura en local borraría la real |
| `RESEND_API_KEY` | Las invitaciones llegan a gente real |

## Trampas conocidas

- Si la CSS parece vieja tras cambiar de rama o añadir reglas: `rm -rf .next` y reiniciar. Turbopack sirve el mismo hash aunque el fichero cambie.
- Matar el dev server por puerto, nunca con `pkill -f "next dev"`: mata también la preview de Ship Studio.
- La preview de Ship Studio entra sin sesión en las capturas y está oculta (sin `requestAnimationFrame` ni autoplay). Para ver la app con sesión o medir rendimiento: Chrome headless con puppeteer-core y `/api/dev-login`.
- En local la mayoría de posts de X no tienen ficheros si no hiciste `files:pull`: tarjetas oscuras y 404 esperados, no es un bug.
- Una migración local con fecha más nueva que las que llegan de `main` hace que Drizzle salte las de `main`: borrar la base y `npm run db:init`.
