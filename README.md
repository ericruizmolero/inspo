This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Multiusuario y equipos (SaaS)

La app es multi-tenant: cada persona entra con su correo (magic link, sin contraseñas) y trabaja
en **workspaces**. Todo el mundo tiene un workspace personal y puede crear equipos e invitar por
correo. Los items, miniaturas y etiquetas IA pertenecen a un workspace; las fichas DESIGN.md se
cachean por URL (globales) pero solo se ven las de URLs guardadas en el workspace activo.

- **Auth**: Better Auth (`lib/auth.ts`), plugins `magicLink` + `organization`. Handler en `app/api/auth/[...all]`.
- **BD**: SQLite/libsql con Drizzle (`lib/db/schema.ts`). Local: `.data/inspo.db`. Producción: Turso (`DATABASE_URL` + `DATABASE_AUTH_TOKEN`).
  Las migraciones están en `drizzle/` y se aplican con `npm run db:migrate` (también en `predev` y `prebuild`).
- **Workspaces**: `lib/workspace.ts` (sesión + workspace activo + permisos) y `lib/workspace-core.ts` (consultas puras).
  Roles: `owner`/`admin` pueden invitar, quitar miembros, etiquetar en lote y regenerar DESIGN.md; `member` añade items y miniaturas.
- **Páginas**: `/login`, `/equipo` (miembros, invitaciones, crear equipo), `/invitacion/[id]`.
- **Correo**: Resend vía `RESEND_API_KEY`. Sin clave (local) el enlace se imprime en consola y en `.data/last-mail.txt`.
- **Sin login en local**: con `DEV_LOGIN_EMAIL=tu@correo` en `.env.local` se entra automáticamente como ese usuario
  (sesión real vía `/api/dev-login`, ignorado en producción). Para volver a probar el login, quita la variable y cierra sesión.
- **Migración del Sheet original**: `npm run migrate:sheet` (idempotente). Crea los usuarios de `TEAM_MEMBERS`,
  el equipo `TEAM_NAME` y vuelca filas, miniaturas y etiquetas.

### Puesta en producción (Vercel)
1. Crear una BD en Turso y poner `DATABASE_URL` / `DATABASE_AUTH_TOKEN`.
2. `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) y `BETTER_AUTH_URL=https://inspo.savvia.studio`.
3. `RESEND_API_KEY` y `MAIL_FROM` con un dominio verificado.
4. Desplegar (el `prebuild` aplica las migraciones) y ejecutar una vez `npm run migrate:sheet` con esas variables
   para importar la librería de treseiscero.
