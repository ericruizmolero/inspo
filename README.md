# Criterio

A shared library of websites that inspire a team, with a DESIGN.md for each one.
Next.js 16, Postgres, Better Auth.

## Run it locally

Five steps, about ten minutes. At the end you have the app on http://localhost:3000 with a copy
of the real library: items, projects, DESIGN.md sheets and their images.

### 1. Install the tools

- Node 22 or newer, and Google Chrome (the app drives it for screenshots).
- [DBngin](https://dbngin.com) runs Postgres. Click **+**, pick PostgreSQL, keep port `5432`
  and start it. The green dot means it's up.
- [TablePlus](https://tableplus.com) (optional) shows what's inside. New connection, PostgreSQL:
  host `127.0.0.1`, port `5432`, user `postgres`, no password, database `criterio`.

DBngin is free and TablePlus has a free version. Only one server can hold port 5432: if Homebrew
Postgres is running, `brew services stop postgresql@17` first.

### 2. Ask for two things

Neither is in git, because both hold real people's data. Ask Alberto or Eric, and get them through
a private channel (AirDrop, 1Password), never a shared chat:

- **`.data/seed.json`**: the copy of the database. Put it in `.data/` in the repo.
- **A read-only R2 key** for the `criterio-files` bucket: an Access Key ID and a Secret. It can
  only download, so it's safe on a laptop.

### 3. Install and load the data

```bash
npm install
npm run db:init   # creates the "criterio" database, builds the tables, loads .data/seed.json
```

`db:init` is safe to run twice: it never loads over existing data. To start over, run
`npm run seed -- --replace`. Without the seed file it still builds the tables, and the app runs
on an empty database.

To refresh your copy from production, put `PULL_DATABASE_URL` in `.env.local` (a read-only Neon
role, ask for it like the seed) and run `npm run db:pull`. It reads production, rewrites
`.data/seed.json`, and replaces everything in your local database. It refuses to write anywhere
but a local database. Then `npm run files:pull` for the new images.

### 4. Download the images

The database points at files in R2. Copy them to `.data/files` once, with the read-only key in
the command, not in `.env.local`:

```bash
R2_ACCOUNT_ID=c7db41271c7e187b4cfd59e5b9f54e93 R2_BUCKET=criterio-files \
R2_ACCESS_KEY_ID=<key> R2_SECRET_ACCESS_KEY=<secret> npm run files:pull
```

Run it again whenever you load a newer seed: it only brings what's new.

### 5. Start

```bash
npm run dev       # http://localhost:3000
```

To sign in, add `DEV_LOGIN_EMAIL=you@email.com` to `.env.local` (an address that exists in the
seed) and open http://localhost:3000/api/dev-login. Without it, the magic link isn't emailed
locally: it prints in the terminal and lands in `.data/last-mail.txt`.

### `.env.local`

Nothing is required. Each key switches one thing on:

| Key | What it turns on |
|---|---|
| `DEV_LOGIN_EMAIL` | Sign in without the email step |
| `OPENROUTER_API_KEY` | DESIGN.md, explain, revisions and vision (every model call) |
| `TYPESAFE_API_KEY` | Jev: AI tags and search |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google button. The OAuth client needs `http://localhost:3000/api/auth/callback/google` as a redirect URI |
| `CHROME_EXECUTABLE_PATH` | Only if Chrome isn't in `/Applications` |

**Keep these out of `.env.local`:**

- `R2_*` with a key that can write. The local database is a copy of production, so deleting a
  thumbnail here would delete the real one. Without R2 keys the app uses `.data/files`.
- `RESEND_API_KEY`, unless you mean it: invitations go to real people.
- `DATABASE_URL`. Locally it defaults to `postgres://postgres@127.0.0.1:5432/criterio`.
  If it holds anything that isn't a Postgres URL, the app ignores it and says so.

### Files

Thumbnails, uploaded images, comment screenshots, DESIGN.md images and saved posts live in a
private Cloudflare R2 bucket in production (`lib/storage.ts`, S3 API) and in `.data/files`
locally. The database stores each one as a path, `/api/files/<key>`, and
`app/api/files/[...key]/route.ts` serves it after checking the workspace.

### Checks

```bash
npm run check:postgres   # cascades, file cleanup, projects, bulk tags, heartbeat, day grouping
npm run check:seats      # plan seat limits
npm run check:invites    # the invitation flow, against the running app
```

### Changing the schema

Edit `lib/db/schema.ts`, then `npm run db:generate`. The app applies the new migration the next
time it starts. Column names are snake_case; the TypeScript names stay camelCase.

**Never edit or regenerate a migration that's already in `drizzle/`.** Production has run it.
Drizzle would try to run a changed one again and the app would stop starting. Every change is a
new file.

### For maintainers

- **Refresh the seed** while production still runs on Turso: on an empty database, `npm run
  db:init` with the seed file moved away, then `TURSO_DATABASE_URL=… TURSO_AUTH_TOKEN=… npm run
  db:copy-turso -- --replace`, then `npm run seed:dump`.
- **Make a read-only key for a teammate**: Cloudflare, R2, Manage API tokens, Create, permission
  **Object Read only**, bucket `criterio-files`. One key per person, so you can revoke one.
- **Production** runs on Coolify from the image GitHub Actions builds
  (`ghcr.io/ericruizmolero/inspo`, `.github/workflows/image.yml`). Its variables live in Coolify.

## Multi-user and teams (SaaS)

The app is multi-tenant: each person signs in with their email (magic link, no passwords) and works
in **workspaces**. Everyone has a personal workspace and can create teams and invite by
email. Items, thumbnails and AI tags belong to a workspace; DESIGN.md sheets are
cached per URL (global), but only those for URLs saved in the active workspace are visible.

- **Auth**: Better Auth (`lib/auth.ts`), plugins `magicLink` + `organization`. Handler in `app/api/auth/[...all]`.
- **DB**: Postgres with Drizzle (`lib/db/schema.ts`). Local: the DBngin server, database `criterio`
  (`postgres://postgres@127.0.0.1:5432/criterio`, the default when `DATABASE_URL` is unset). Production and staging: `DATABASE_URL`.
  `npm run db:generate` writes a migration to `drizzle/`. The app applies pending ones when it starts
  (`instrumentation.ts`, behind an advisory lock). Builds never migrate, and of the scripts only
  `db:init` does, on a local database.
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
