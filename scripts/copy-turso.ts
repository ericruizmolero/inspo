// One-time copy of the old Turso (SQLite) database into Postgres. Only reads from Turso.
//   TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run db:copy-turso              → into DATABASE_URL, which must be empty
//   … npm run db:copy-turso -- --replace                                               → empties it first
// The target needs its tables first: start the app once (or npm run db:init on a local database).
// Ids are copied as they are: they live in file paths and cookies.
// Column names: Turso kept Better Auth's camelCase ("emailVerified"), Postgres uses snake_case;
// each column is looked up by both. Workspace kind and plan come out of the old metadata JSON.
// Turso never enforced foreign keys, so there are orphans: a row whose parent is gone is skipped
// (cascade) or keeps the row with the reference cleared (set null), and the count is printed.
// Remove this script and @libsql/client once production runs on Postgres.
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();

import { createClient, type Row as LibsqlRow } from "@libsql/client";
import { getTableColumns, sql } from "drizzle-orm";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { db, pool, schema } from "../lib/db";
import { databaseUrl } from "../lib/db/url";

// Parents before children
const TABLES: PgTable[] = [
  schema.user, schema.organization, schema.session, schema.account, schema.verification,
  schema.member, schema.invitation, schema.inspoItem, schema.project, schema.projectItem,
  schema.designRevision, schema.designWhy, schema.inspoComment, schema.aiUsage, schema.activitySegment,
  schema.appAdmin, schema.feedbackNote, schema.extKey,
];

function convert(columnType: string, v: unknown, notNull: boolean): { ok: true; value: unknown } | { ok: false } {
  if (v === null || v === undefined) return { ok: true, value: null };
  switch (columnType) {
    case "PgTimestamp": return { ok: true, value: new Date(Number(v)) };
    case "PgBoolean": return { ok: true, value: Number(v) !== 0 };
    case "PgInteger": return { ok: true, value: Number(v) };
    case "PgJsonb":
      try { return { ok: true, value: JSON.parse(String(v)) }; }
      catch { return notNull ? { ok: false } : { ok: true, value: null }; }
    default: return { ok: true, value: String(v) };
  }
}

async function main() {
  const replace = process.argv.includes("--replace");
  const src = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN;
  if (!src?.startsWith("libsql://")) throw new Error("Set TURSO_DATABASE_URL (libsql://…) and TURSO_AUTH_TOKEN");
  const target = new URL(databaseUrl());
  console.log(`From ${new URL(src).host} → ${target.host}${target.pathname}`);

  const turso = createClient({ url: src, authToken });
  const names = TABLES.map((t) => getTableConfig(t).name);
  const ready = await pool.query(`select to_regclass('public.project_item') as t`);
  if (!ready.rows[0].t) throw new Error("The target has no schema yet. Start the app once, or run npm run db:init locally.");
  const [{ n }] = (await pool.query(`select ${names.map((x) => `(select count(*) from "${x}")`).join(" + ")} as n`)).rows;
  if (Number(n) > 0 && !replace) throw new Error(`Target has ${n} rows. Run with --replace to empty it first.`);
  const sourceTables = new Set((await turso.execute("select name from sqlite_master where type = 'table'")).rows.map((r) => String(r.name)));

  const ids = new Map<string, Set<string>>();
  await db.transaction(async (tx) => {
    if (replace) await tx.execute(sql.raw(`truncate ${names.map((x) => `"${x}"`).join(", ")} cascade`));

    for (const table of TABLES) {
      const cfg = getTableConfig(table);
      if (!sourceTables.has(cfg.name)) { console.log(`${cfg.name.padEnd(18)}  not in Turso, skipped`); continue; }
      const cols = Object.entries(getTableColumns(table));
      const fks = cfg.foreignKeys.map((fk) => {
        const r = fk.reference();
        return { col: r.columns[0].name, parent: getTableConfig(r.foreignTable).name, onDelete: fk.onDelete };
      });
      const pkCols = cfg.primaryKeys[0]?.columns.map((c) => c.name) ?? [cols.find(([, c]) => c.primary)![1].name];

      const res = await turso.execute(`select * from "${cfg.name}"`);
      const rows: Record<string, unknown>[] = [];
      let skipped = 0, cleared = 0, broken = 0;
      for (const s of res.rows as LibsqlRow[]) {
        const raw = s as unknown as Record<string, unknown>;
        let keep = true;
        const row: Record<string, unknown> = {};
        for (const [key, col] of cols) {
          if (cfg.name === "organization" && (key === "kind" || key === "plan")) continue;
          const c = convert(col.columnType, raw[col.name] ?? raw[key], col.notNull);
          if (!c.ok) { keep = false; broken++; break; }
          row[key] = c.value;
        }
        if (!keep) continue;
        if (cfg.name === "organization") {
          let meta: { kind?: string; plan?: string } = {};
          try { meta = JSON.parse(String(raw.metadata ?? "{}")) ?? {}; } catch { /* broken metadata */ }
          row.kind = meta.kind === "personal" ? "personal" : "team";
          row.plan = ["solo", "studio", "agency"].includes(meta.plan ?? "") ? meta.plan : "solo";
          row.metadata = null;
        }
        for (const fk of fks) {
          const key = cols.find(([, c]) => c.name === fk.col)![0];
          const v = row[key];
          if (v === null || ids.get(fk.parent)?.has(String(v))) continue;
          if (fk.onDelete === "set null") { row[key] = null; cleared++; }
          else { keep = false; skipped++; break; }
        }
        if (keep) rows.push(row);
      }

      for (let i = 0; i < rows.length; i += 200) await tx.insert(table).values(rows.slice(i, i + 200) as never);
      const keyOfRow = (r: Record<string, unknown>) => pkCols.map((c) => r[cols.find(([, col]) => col.name === c)![0]]).join("|");
      ids.set(cfg.name, new Set(rows.map(keyOfRow)));

      const notes = [skipped && `${skipped} orphans skipped`, cleared && `${cleared} dead references cleared`, broken && `${broken} with broken JSON skipped`].filter(Boolean);
      console.log(`${cfg.name.padEnd(18)} ${String(res.rows.length).padStart(6)} read, ${String(rows.length).padStart(6)} written${notes.length ? `  (${notes.join(", ")})` : ""}`);
    }
  });
  turso.close();
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => pool.end());
