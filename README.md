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

## Multi-user and teams (SaaS)

The app is multi-tenant: each person signs in with their email (magic link, no passwords) and works
in **workspaces**. Everyone has a personal workspace and can create teams and invite by
email. Items, thumbnails and AI tags belong to a workspace; DESIGN.md sheets are
cached per URL (global), but only those for URLs saved in the active workspace are visible.

- **Auth**: Better Auth (`lib/auth.ts`), plugins `magicLink` + `organization`. Handler in `app/api/auth/[...all]`.
- **DB**: SQLite/libsql with Drizzle (`lib/db/schema.ts`). Local: `.data/inspo.db`. Production: Turso (`DATABASE_URL` + `DATABASE_AUTH_TOKEN`).
  Migrations live in `drizzle/` and run with `npm run db:migrate` (also in `predev` and `prebuild`).
- **Workspaces**: `lib/workspace.ts` (session + active workspace + permissions) and `lib/workspace-core.ts` (pure queries).
  Roles: `owner`/`admin` can invite, remove members, batch tag and regenerate DESIGN.md; `member` adds items and thumbnails.
- **Pages**: `/login`, `/settings/members` (members, invitations, create a team), `/invite/[id]`.
- **Email**: Resend via `RESEND_API_KEY`. Without a key (local) the link is printed to the console and to `.data/last-mail.txt`.
- **No login locally**: with `DEV_LOGIN_EMAIL=you@email` in `.env.local` you sign in automatically as that user
  (real session via `/api/dev-login`, ignored in production). To test login again, remove the variable and sign out.
- **Original Sheet migration**: `npm run migrate:sheet` (idempotent). Creates the `TEAM_MEMBERS` users,
  the `TEAM_NAME` team, and loads rows, thumbnails and tags.

### Going to production (Vercel)
1. Create a Turso DB and set `DATABASE_URL` / `DATABASE_AUTH_TOKEN`.
2. `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL=https://inspo.savvia.studio`.
3. `RESEND_API_KEY` and `MAIL_FROM` with a verified domain.
4. Deploy (`prebuild` runs the migrations) and run `npm run migrate:sheet` once with those variables
   to import the treseiscero library.
