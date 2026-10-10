// Local data: a JSON dump of every table, kept in .data/seed.json (git-ignored: it holds real
// people's emails and sessions, so each machine gets its copy by hand, never through git).
//   npm run seed:dump   → writes .data/seed.json from DATABASE_URL (local by default)
//   npm run seed        → loads it into an empty database (--replace empties it first)
//   npm run db:init     → creates the database if missing, applies the migrations, then seeds
//   npm run db:pull     → copies production (PULL_DATABASE_URL) over the local database:
//                         dumps it to .data/seed.json, then db:init with --replace
// db:init and db:pull are the scripts that migrate, and only against a local database: they are
// machine setup. Deploys migrate in the build (scripts/migrate.ts), `next dev` when it starts.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { promises as fs } from "fs";
import path from "path";
import { Client, Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { getTableColumns, sql } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { databaseUrl } from "../lib/db/url";

const FILE = path.join(process.cwd(), ".data", "seed.json");
const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);

type Dump = { at: string; tables: Record<string, Record<string, unknown>[]> };

async function tables() {
  const { schema } = await import("../lib/db");
  // Parents before children, so foreign keys hold while loading
  const list: PgTable[] = [
    schema.user, schema.organization, schema.session, schema.account, schema.verification,
    schema.member, schema.invitation, schema.inspoItem, schema.project, schema.projectItem, schema.designRevision, schema.designWhy,
    schema.inspoComment, schema.aiUsage, schema.activitySegment, schema.appAdmin, schema.feedbackNote, schema.extKey,
    schema.projectSystem, schema.systemArea, schema.systemAreaRevision, schema.systemAreaComment,
    schema.systemShare, schema.rateLimit, schema.mcpClient, schema.mcpGrant,
  ];
  // A table added to the schema but not to this list would vanish from every dump without a word
  const all = (Object.values(schema) as unknown[]).filter((v): v is PgTable => v instanceof PgTable);
  const missing = all.filter((t) => !list.includes(t)).map((t) => getTableConfig(t).name);
  if (missing.length) throw new Error(`scripts/seed.ts does not list: ${missing.join(", ")}. Add them in parent-first order.`);
  return list.map((t) => ({ table: t, name: getTableConfig(t).name, cols: getTableColumns(t) }));
}

/** From DATABASE_URL (local by default), or from `from` when it is given */
async function dump(from?: string) {
  const app = await import("../lib/db");
  const pool = from ? new Pool({ connectionString: from }) : app.pool;
  const db = from ? drizzle(pool, { schema: app.schema }) : app.db;
  const out: Dump = { at: new Date().toISOString(), tables: {} };
  for (const { table, name, cols } of await tables()) {
    // The local schema can be ahead of the source (a migration not deployed yet): read only the columns the
    // source has, and the load leaves the new ones to their defaults
    const have = new Set((await pool.query("select column_name from information_schema.columns where table_schema = 'public' and table_name = $1", [name])).rows.map((r) => r.column_name as string));
    const shared = Object.fromEntries(Object.entries(cols).filter(([, c]) => have.has(c.name)));
    // A table the source does not have yet (its migration is not deployed): nothing to copy
    if (!have.size) { console.log(`${name}: not in the source yet, skipped`); out.tables[name] = []; continue; }
    const skipped = Object.values(cols).filter((c) => !have.has(c.name)).map((c) => c.name);
    if (skipped.length) console.log(`${name}: not in the source yet, left to defaults: ${skipped.join(", ")}`);
    out.tables[name] = await db.select(shared).from(table);
    console.log(`${name.padEnd(18)} ${String(out.tables[name].length).padStart(6)}`);
  }
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(out));
  await pool.end();
  console.log(`→ ${path.relative(process.cwd(), FILE)}`);
}

/** The local database, or an error: loading over anything else would overwrite real data */
function localUrl(script: string): URL {
  const url = new URL(databaseUrl());
  if (!LOCAL_HOSTS.has(url.hostname)) throw new Error(`${script} only writes to a local database, not ${url.hostname}`);
  return url;
}

async function load(replace: boolean) {
  let data: Dump;
  try { data = JSON.parse(await fs.readFile(FILE, "utf8")); }
  catch { throw new Error(`No ${path.relative(process.cwd(), FILE)}. Copy it from a machine that has the data (npm run seed:dump there).`); }
  const { db, pool } = await import("../lib/db");
  const list = await tables();
  const [{ n }] = (await pool.query(`select ${list.map((t) => `(select count(*) from "${t.name}")`).join(" + ")} as n`)).rows;
  if (Number(n) > 0 && !replace) {
    console.log(`The database already has ${n} rows: nothing loaded. Run with --replace to empty it first.`);
    await pool.end();
    return;
  }
  await db.transaction(async (tx) => {
    if (replace) await tx.execute(sql.raw(`truncate ${list.map((t) => `"${t.name}"`).join(", ")} cascade`));
    for (const { table, name, cols } of list) {
      // JSON turned dates into strings: back to Date for the timestamp columns
      const dates = Object.entries(cols).filter(([, c]) => c.columnType === "PgTimestamp").map(([k]) => k);
      const rows = (data.tables[name] ?? []).map((r) => {
        const row = { ...r };
        for (const k of dates) if (row[k] != null) row[k] = new Date(row[k] as string);
        return row;
      });
      for (let i = 0; i < rows.length; i += 200) await tx.insert(table).values(rows.slice(i, i + 200) as never);
      console.log(`${name.padEnd(18)} ${String(rows.length).padStart(6)}`);
    }
  });
  await pool.end();
  console.log(`Loaded the dump from ${data.at}`);
}

async function init(replace = false) {
  const url = localUrl("db:init");
  const name = decodeURIComponent(url.pathname.slice(1));
  const admin = new URL(url); admin.pathname = "/postgres";
  const c = new Client({ connectionString: admin.toString() });
  await c.connect();
  const exists = (await c.query("select 1 from pg_database where datname = $1", [name])).rowCount;
  if (!exists) { await c.query(`create database "${name.replace(/"/g, '""')}"`); console.log(`Created database ${name}`); }
  await c.end();

  const { runMigrations } = await import("../lib/db/migrate");
  await runMigrations();
  console.log("Schema up to date");
  await load(replace);
}

// Production is only read: a select per table. The local database is then emptied and refilled.
async function pull() {
  const from = process.env.PULL_DATABASE_URL?.trim();
  if (!from) throw new Error("Set PULL_DATABASE_URL in .env.local to the production database (Neon, a read-only role)");
  if (LOCAL_HOSTS.has(new URL(from).hostname)) throw new Error("PULL_DATABASE_URL is a local database: nothing to pull");
  localUrl("db:pull");
  console.log(`Reading ${new URL(from).hostname}`);
  await dump(from);
  await init(true);
}

const mode = process.argv[2];
(mode === "dump" ? dump() : mode === "init" ? init() : mode === "pull" ? pull() : load(process.argv.includes("--replace")))
  .catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
