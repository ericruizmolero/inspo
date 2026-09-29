# Criterio

A shared library of websites that inspire a team, with a DESIGN.md for each one.
Next.js 16, Postgres, Better Auth.

## Run it locally

You need Node 22 or newer, a Postgres server on port 5432, and Google Chrome (for screenshots).

### Postgres on a Mac

Two apps from the same people (DBngin is free, TablePlus has a free version), and you never touch a
config file:

- [DBngin](https://dbngin.com) runs the server. Click **+**, pick PostgreSQL, keep port `5432`
  and start it. The green dot means it's up.
- [TablePlus](https://tableplus.com) shows what's inside. New connection, PostgreSQL: host
  `127.0.0.1`, port `5432`, user `postgres`, no password, database `criterio`. Refresh with ⌘R
  after a migration.

Only one server can hold port 5432. If Homebrew Postgres is running,
`brew services stop postgresql@17` first.

### Start

```bash
npm install
npm run db:init   # creates the "criterio" database, builds the tables, loads .data/seed.json
npm run dev       # http://localhost:3000
```

`db:init` needs `.data/seed.json`, a copy of the real data. It is not in git (it holds people's
emails), so ask for it and drop it in `.data/`. Without it, `db:init` still builds the tables and
then stops with a note. The app runs on the empty database: sign in and it creates your personal
workspace.

`db:init` is safe to run twice: it never loads over existing data. To start over, run
`npm run seed -- --replace`.

To refresh `.data/seed.json` from production while it still runs on Turso: run `npm run db:init`
on an empty database with the seed file moved away, then
`TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run db:copy-turso -- --replace`, then `npm run seed:dump`.

The database is `postgres://postgres@127.0.0.1:5432/criterio` with no password. That is the default,
so `DATABASE_URL` stays unset locally.

### Signing in

The magic link isn't emailed locally. It prints in the terminal and lands in `.data/last-mail.txt`.
To skip it, add `DEV_LOGIN_EMAIL=you@email.com` to `.env.local` and open `/api/dev-login`.

### `.env.local`

Nothing is required. Each key switches one thing on:

| Key | What it turns on |
|---|---|
| `DEV_LOGIN_EMAIL` | Sign in without the email step |
| `OPENROUTER_API_KEY` | DESIGN.md, explain, revisions and vision (every model call) |
| `TYPESAFE_API_KEY`, `TYPESAFE_BASE_URL` | Jev: AI tags and search |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google button. The OAuth client needs `http://localhost:3000/api/auth/callback/google` as a redirect URI |
| `RESEND_API_KEY` | Real emails. Leave it off unless you mean it: invitations go to real people |
| `CHROME_EXECUTABLE_PATH` | Only if Chrome isn't in `/Applications` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Production only (see below). `R2_ENDPOINT` points the same code at any S3 server, MinIO for example |

Two sets of keys stay out of `.env.local` on purpose. The `R2_*` keys write to production storage,
and the local database is a copy of production: deleting a thumbnail here would delete the real one.
Without them, files go to `.data/files`. And `DATABASE_URL`, unless you point at another Postgres
on purpose.

### Files

Thumbnails, comment screenshots, DESIGN.md images and captures live in a private Cloudflare R2
bucket in production (`lib/storage.ts`, S3 API) and in `.data/files` locally. The database stores
each one as a path, `/api/files/<key>`, and `app/api/files/[...key]/route.ts` serves it after
checking the workspace. Images copied from production point at R2, so locally they show as broken
unless you download them.

Vercel marks every production value as Sensitive, so `vercel env pull` only brings back the text
`[SENSITIVE]`. Real values come from the person who holds them.

### Checks

```bash
npm run check:postgres   # cascades, file cleanup, bulk tags, heartbeat, day grouping
npm run check:seats      # plan seat limits
npm run check:invites    # the invitation flow, against the running app
```

### Changing the schema

Edit `lib/db/schema.ts`, then `npm run db:generate`. The app applies the new migration the next
time it starts. Column names are snake_case; the TypeScript names stay camelCase.

## Multi-user and teams (SaaS)

The app is multi-tenant: each person signs in with their email (magic link, no passwords) and works
in **workspaces**. Everyone has a personal workspace and can create teams and invite by
email. Items, thumbnails and AI tags belong to a workspace; DESIGN.md sheets are
cached per URL (global), but only those for URLs saved in the active workspace are visible.

- **Auth**: Better Auth (`lib/auth.ts`), plugins `magicLink` + `organization`. Handler in `app/api/auth/[...all]`.
- **DB**: Postgres with Drizzle (`lib/db/schema.ts`). Local: the DBngin server, database `criterio`
  (`postgres://postgres@127.0.0.1:5432/criterio`, the default when `DATABASE_URL` is unset). Production and staging: `DATABASE_URL`.
  `npm run db:generate` writes a migration to `drizzle/`. The app applies pending ones when it starts
  (`instrumentation.ts`, behind an advisory lock); builds and scripts never migrate.
- **Local data**: `npm run db:init` creates the database if it is missing, applies the migrations and loads
  `.data/seed.json`. That file holds real people's data, so it is git-ignored: copy it from a machine that has it
  (`npm run seed:dump` writes it from the current database). `npm run seed -- --replace` reloads it.
- **Workspaces**: `lib/workspace.ts` (session + active workspace + permissions) and `lib/workspace-core.ts` (pure queries).
  Roles: `owner`/`admin` can invite, remove members, batch tag and regenerate DESIGN.md; `member` adds items and thumbnails.
- **Pages**: `/login`, `/settings/members` (members, invitations, create a team), `/invite/[id]`.
- **Email**: Resend via `RESEND_API_KEY`. Without a key (local) the link is printed to the console and to `.data/last-mail.txt`.
- **No login locally**: with `DEV_LOGIN_EMAIL=you@email` in `.env.local` you sign in automatically as that user
  (real session via `/api/dev-login`, ignored in production). To test login again, remove the variable and sign out.
- **Original Sheet migration**: `npm run migrate:sheet` (idempotent). Creates the `TEAM_MEMBERS` users,
  the `TEAM_NAME` team, and loads rows, thumbnails and tags.

### Going to production
1. Create a Postgres database, set `DATABASE_URL` and turn on scheduled backups.
   Create a private R2 bucket and set the four `R2_*` keys.
2. `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) and `BETTER_AUTH_URL` with the public URL.
3. `RESEND_API_KEY` and `MAIL_FROM` with a verified domain.
4. Deploy. The app applies the migrations when it starts.
