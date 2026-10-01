# Criterio

A shared library of websites that inspire a team, with a DESIGN.md for each one.
Next.js 16, Postgres, Better Auth.

## How it runs

No server to look after. Each part is a managed service:

| Part | Where | Notes |
|---|---|---|
| App, API, Chromium | **Vercel**, functions in Frankfurt (`fra1`) | `vercel.json`. Chromium runs inside the functions (`@sparticuz/chromium`) |
| Database | **Neon** Postgres, AWS Frankfurt | Connected through the Vercel integration. Point-in-time restore |
| Files | **Cloudflare R2**, private bucket `criterio-files` | Served and uploaded through signed URLs (see [Files](#files)) |
| Email | **Resend** | Magic links and invitations |
| AI | **OpenRouter** (every model call), **Typesafe** (Jev: tags and search) | |

- A push to `main` deploys production.
- Every pull request gets a preview URL with its own copy of the database (a Neon branch).
- The daily cron (`/api/cron/usage-check`) is in `vercel.json`.

> Until the DNS of `criterio.design` points to Vercel, the domain still serves the old Coolify
> server on Hetzner. `.github/workflows/image.yml` and the `Dockerfile` only exist for that server.
> Remove them once it's shut down.

## Run it locally

Five steps, about ten minutes. At the end you have the app on http://localhost:3000 with a copy
of the real library: items, projects, DESIGN.md sheets and their images.

### 1. Install the tools

- Node 22 or newer, and Google Chrome (the app drives it for screenshots).
- [DBngin](https://dbngin.com) runs Postgres. Click **+**, pick PostgreSQL 18, keep port `5432`
  and start it. The green dot means it's up.
- [TablePlus](https://tableplus.com) (optional) shows what's inside. New connection, PostgreSQL:
  host `127.0.0.1`, port `5432`, user `postgres`, no password, database `criterio`.

DBngin is free and TablePlus has a free version. Only one server can hold port 5432: if Homebrew
Postgres is running, `brew services stop postgresql@17` first.

### 2. Ask for two things

Neither is in git, because both give access to real people's data. Ask Alberto or Eric, and get
them through a private channel (AirDrop, 1Password), never a shared chat:

- **`PULL_DATABASE_URL`**: a read-only Neon address. It can only read production. Put it in
  `.env.local`. (Or ask for `.data/seed.json`, a file copy of the database, and put it in `.data/`.)
- **A read-only R2 key** for the `criterio-files` bucket: an Access Key ID and a Secret. It can
  only download, so it's safe on a laptop.

### 3. Install and load the data

```bash
npm install
npm run db:pull   # creates the "criterio" database, builds the tables, copies production into it
```

`db:pull` reads production, saves it to `.data/seed.json`, and replaces everything in your local
database. It refuses to write anywhere but a local database. Run it again whenever you want fresh
data.

With only the seed file, run `npm run db:init` instead. It loads `.data/seed.json` into an empty
database and never loads over existing data (`npm run seed -- --replace` starts over). Without
any data it still builds the tables, and the app runs on an empty database.

### 4. Download the images

The database points at files in R2. Copy them to `.data/files`, with the read-only key in the
command, not in `.env.local`:

```bash
R2_ACCOUNT_ID=c7db41271c7e187b4cfd59e5b9f54e93 R2_BUCKET=criterio-files \
R2_ACCESS_KEY_ID=<key> R2_SECRET_ACCESS_KEY=<secret> npm run files:pull
```

Run it again after each `db:pull`: it only brings what's new.

### 5. Start

```bash
npm run dev       # http://localhost:3000
```

To sign in, add `DEV_LOGIN_EMAIL=you@email.com` to `.env.local` (an address that exists in the
data) and open http://localhost:3000/api/dev-login. Without it, the magic link isn't emailed
locally: it prints in the terminal and lands in `.data/last-mail.txt`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | The app on http://localhost:3000 |
| `npm run build` | A production build. Run it before a push that touches config or routes |
| `npm run db:pull` | Copies production (read-only) over your local database |
| `npm run files:pull` | Copies the R2 files you don't have yet into `.data/files` |
| `npm run db:init` | Creates the local database, migrates, loads `.data/seed.json` if it's empty |
| `npm run seed -- --replace` | Empties the local database and loads `.data/seed.json` again |
| `npm run seed:dump` | Writes your local database to `.data/seed.json` |
| `npm run db:generate` | Writes a migration after a change to `lib/db/schema.ts` |
| `npm run db:studio` | Drizzle Studio, a browser view of the local database |
| `npm run plan -- <workspace> <solo\|studio\|agency>` | Changes a workspace's plan (there's no payment gateway yet) |
| `npm run admin -- <email>` | Gives access to `/admin`. `--remove` takes it away, `--list` shows who has it |
| `npm run shots:directory` | Captures missing Directory thumbnails into `public/directory/` (`--force` redoes all) |

Scripts run against `DATABASE_URL`, which is your local database unless you set it. That's on
purpose: keep it that way.

## `.env.local`

Nothing is required. Each key switches one thing on:

| Key | What it turns on |
|---|---|
| `DEV_LOGIN_EMAIL` | Sign in without the email step |
| `PULL_DATABASE_URL` | `npm run db:pull` (read-only Neon role) |
| `OPENROUTER_API_KEY` | DESIGN.md, explain, revisions and vision (every model call) |
| `TYPESAFE_API_KEY` | Jev: AI tags and search |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | The Google button. The OAuth client needs `http://localhost:3000/api/auth/callback/google` as a redirect URI |
| `CHROME_EXECUTABLE_PATH` | Only if Chrome isn't in `/Applications` |

**Keep these out of `.env.local`:**

- `DATABASE_URL` and the other Neon variables (`DATABASE_URL_UNPOOLED`, `PG*`, `POSTGRES_*`).
  They would point your local app at production, and every click would change real data. Locally
  it defaults to `postgres://postgres@127.0.0.1:5432/criterio`.
- `R2_*` with a key that can write. Your local database is a copy of production, so deleting a
  thumbnail here would delete the real one. Without R2 keys the app uses `.data/files`.
- `RESEND_API_KEY`, unless you mean it: invitations go to real people.

## Files

Thumbnails, uploaded images, comment screenshots, DESIGN.md images and saved posts from X live in
the private R2 bucket in production and in `.data/files` locally (`lib/storage.ts`). The database
stores each one as a path, `/api/files/<key>`, and never as an R2 address.

- **Reading**: `app/api/files/[...key]/route.ts` checks the session and the workspace, then
  redirects to a signed R2 URL, so the bytes (60 MB videos included) never pass through a
  function. The URL stays the same for an hour, so the browser cache works. Locally the route
  streams the file itself.
- **Uploading images up to 20 MB**: a Vercel function takes 4.5 MB at most, so the browser asks
  `/api/media` for a signed URL and PUTs the file straight to R2 (`lib/media-client.ts`). R2
  refuses a body of another size or type. Locally the file is posted to the app as before.
- **R2 CORS** (Cloudflare, R2, `criterio-files`, Settings) must allow `PUT` from
  `https://criterio.design` and `https://inspo-criterio-design.vercel.app`, or uploads fail.
  Add an origin there if the app gets a new domain.
- Preview deployments use the same bucket as production. Deleting an item in a preview deletes
  its real image.

## The database

Postgres with Drizzle (`lib/db/schema.ts`). Column names are snake_case; the TypeScript names stay
camelCase.

To change the schema, edit `lib/db/schema.ts`, then `npm run db:generate`. The app applies the new
migration the next time it starts (`instrumentation.ts`): locally on `npm run dev`, in production on
the first request after a deploy.

**Never edit or regenerate a migration that's already in `drizzle/`.** Production has run it.
Drizzle would try to run a changed one again and the app would stop starting. Every change is a
new file.

- Migrations run behind an advisory lock, on a direct connection (`DATABASE_URL_UNPOOLED`): the
  pooled one can't hold a session lock. Builds never migrate. Of the scripts, only `db:init` and
  `db:pull` do, and only on a local database.
- A pull request's preview runs its migrations on its own Neon branch, never on production.
- Restoring after a mistake: Neon console, the project, **Restore**, pick the minute before.

## Deploys and environment variables

- Push to `main`: production. Open a pull request: a preview with its own database branch.
  A comment on the PR links to it. Preview URLs ask for a Vercel login.
- Roll back: Vercel, Deployments, the last good one, **Promote to Production**. Instant.
- The variables live in Vercel (Settings, Environment Variables). `vercel env ls` lists them.
  Most are marked sensitive, so nobody can read them back, not even with `vercel env pull`.

| Variable | Set by |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PG*`, `POSTGRES_*` | The Neon integration. Don't edit them by hand |
| `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | By hand. A key with Object Read & Write on `criterio-files` |
| `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` | By hand. The URL is the public one, `https://criterio.design` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | By hand |
| `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO` | By hand. `MAIL_FROM` needs a domain verified in Resend |
| `OPENROUTER_API_KEY`, `TYPESAFE_API_KEY`, `TYPESAFE_BASE_URL` | By hand |
| `CRON_SECRET` | By hand. Vercel sends it to the cron route; without it the route refuses everything |

## Checks

Not a test framework: scripts that assert and clean up after themselves. They run against your
local database.

```bash
npm run check:postgres   # cascades, file cleanup, projects, bulk tags, heartbeat, day grouping
npm run check:seats      # plan seat limits
npm run check:invites    # the invitation flow, against the running app (npm run dev first)
npm run check:locale     # which language each page and email uses
npm run check:design     # the DESIGN.md data before and after the model
npm run check:usage      # the cost reconciliation with OpenRouter
```

## For maintainers

- **Read-only R2 key for a teammate**: Cloudflare, R2, Manage API tokens, Create, permission
  **Object Read only**, bucket `criterio-files`. One key per person, so you can revoke one.
- **Read-only database access for a teammate** (`PULL_DATABASE_URL`): the role `dev_readonly`
  already exists in Neon with `pg_read_all_data`. Give its address, the direct host (no
  `-pooler`), privately. To cut everyone off, change its password in the Neon console.
- **Rotate a key**: make the new one, update it in Vercel, redeploy, then delete the old one.
- **Sign in with Apple**: its secret expires every 6 months. Regenerate it with
  `npm run apple:secret -- <AuthKey.p8> <TEAM_ID> <KEY_ID> <SERVICES_ID>` and update
  `APPLE_CLIENT_SECRET`.
- **Vercel plan**: the team is on Hobby, which is for non-commercial use. Move to Pro before the
  first customer pays. Neon goes from Free to Launch at the same moment, for point-in-time restore
  of several days.

## Multi-user and teams (SaaS)

The app is multi-tenant: each person signs in with their email (magic link, no passwords) and works
in **workspaces**. Everyone has a personal workspace and can create teams and invite by
email. Items, thumbnails and AI tags belong to a workspace; DESIGN.md sheets are
cached per URL (global), but only those for URLs saved in the active workspace are visible.

- **Auth**: Better Auth (`lib/auth.ts`), plugins `magicLink` + `organization`. Handler in `app/api/auth/[...all]`.
- **Workspaces**: `lib/workspace.ts` (session + active workspace + permissions) and `lib/workspace-core.ts` (pure queries).
  Roles: `owner`/`admin` can invite, remove members, batch tag and regenerate DESIGN.md; `member` adds items and thumbnails.
- **Pages**: `/login`, `/settings/members` (members, invitations, create a team), `/invite/[id]`.
- **Email**: Resend via `RESEND_API_KEY`. Without a key (local) the link is printed to the console and to `.data/last-mail.txt`.
- **No login locally**: with `DEV_LOGIN_EMAIL=you@email` in `.env.local` you sign in automatically as that user
  (real session via `/api/dev-login`, ignored in production). To test login again, remove the variable and sign out.
- **Browser extension**: in `extension/` (its own README). It signs in with a per-user key (`/api/ext/`, `lib/ext-keys.ts`).
- **Screenshots and DESIGN.md**: one Chromium at a time per instance (`lib/browser-gate.ts`, `CHROME_CONCURRENCY` raises it).
