// How long the library takes to load for a workspace of 2,000 references, with 20 other workspaces of the same
// size around it, and how much it sends. Prints the median of loadLibrary (its R2 indexes are cached), its first
// page alone, the board's stamp and the search quota count; the bytes of the first page against all 2,000
// references, and of the pulse's answer with nothing changed and with one reference changed; and the plan Postgres
// picks for each query. Every reference carries the tags of a real one when the local database has any. Local
// database only: it refuses anything else, and deletes what it made.
//   npm run bench:library
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { databaseUrl, LOCAL_DATABASE_URL } from "../lib/db/url";
import { db, pool } from "../lib/db";
import { listRows } from "../lib/items";
import { quotaStatus } from "../lib/quota";
import { loadLibrary, loadPage, readStamp } from "../lib/library";
import { applyPage, type Mirror } from "../lib/library-mirror";
import { pulse } from "../lib/pulse";
import { latestTeamEvent } from "../lib/notify";
import type { SessionUser, Workspace } from "../lib/workspace-core";

const ITEMS = 2_000, NOISE = 20, RUNS = 30;

async function main() {
  if (databaseUrl() !== LOCAL_DATABASE_URL) throw new Error("bench:library runs on the local database only");
  const tag = `bench${Date.now().toString(36)}`;
  const orgs = Array.from({ length: NOISE + 1 }, (_, i) => `${tag}-${i}`);
  const ws = { id: orgs[0], name: orgs[0], slug: orgs[0], kind: "team", role: "owner", logo: null, plan: "studio" } as unknown as Workspace;
  const user: SessionUser = { id: `${tag}-user`, name: "bench", email: "bench@example.invalid", language: "en" };
  try {
    await db.execute(sql`insert into "user" (id, name, email, email_verified, created_at, updated_at) values (${user.id}, 'bench', ${`${tag}@example.invalid`}, true, now(), now())`);
    await db.execute(sql`insert into organization (id, name, slug, created_at, plan, kind)
      select o, o, o, now(), 'studio', 'team' from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w`);
    await db.execute(sql`insert into member (id, organization_id, user_id, role, created_at) values (${`${tag}-m`}, ${ws.id}, ${user.id}, 'owner', now())`);
    const { rows: [real] } = await db.execute<{ tags: unknown }>(sql`select tags_json as tags from inspo_item where tags_json is not null and organization_id not like 'bench%' order by updated_at desc limit 1`);
    console.log(real ? "tags: a real reference's, copied onto every row" : "tags: none (no tagged reference in the local database)");
    await db.execute(sql`insert into inspo_item (id, organization_id, name, web, web_key, date, author, thumbnail_url, tag_status, tags_json, created_at, updated_at)
      select o || '-' || n, o, 'Ref ' || n, 'https://' || n || '.' || o || '.example', n || '.' || o || '.example',
        to_char(date '2026-01-01' + (n % 280), 'YYYY-MM-DD'), 'bench', '/api/files/' || o || '/' || n || '.png', 'done', ${real ? JSON.stringify(real.tags) : null}::jsonb,
        now() - n * interval '1 minute', now() - n * interval '1 minute'
      from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, ${ITEMS}) n`);
    // A thread on one reference in four
    await db.execute(sql`insert into inspo_comment (id, organization_id, item_id, author_name, body, created_at)
      select o || '-c' || n, o, o || '-' || n, 'bench', 'A line about reference ' || n || ', the way a teammate writes one.', now() - n * interval '1 minute'
      from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(4, ${ITEMS}, 4) n`);
    await db.execute(sql`insert into project (id, organization_id, name, created_at, updated_at)
      select o || '-p' || n, o, 'Project ' || n, now(), now() from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, 20) n`);
    await db.execute(sql`insert into project_item (project_id, item_id, organization_id, created_at)
      select o || '-p' || (n % 20 + 1), o || '-' || n, o, now() from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, ${ITEMS} / 2) n`);
    // A month of typing in the search box: 3,000 calls over 600 distinct queries
    await db.execute(sql`insert into ai_usage (id, organization_id, action, model, ref, created_at)
      select o || '-u' || n, o, 'jev_search', 'bench', 'query ' || (n % 600), date_trunc('month', now()) + (n % 600) * interval '1 minute'
      from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, 3000) n`);
    await db.execute(sql`analyze inspo_item; analyze inspo_comment; analyze project_item; analyze project; analyze ai_usage`);

    const time = async (f: () => Promise<unknown>) => {
      const ms: number[] = [];
      for (let i = 0; i < RUNS; i++) { const t = performance.now(); await f(); ms.push(performance.now() - t); }
      ms.sort((a, b) => a - b);
      return `median ${ms[RUNS >> 1].toFixed(1)} ms, p90 ${ms[Math.floor(RUNS * 0.9)].toFixed(1)} ms`;
    };
    const library = () => loadLibrary(user, ws);
    await library();
    console.log(`loadLibrary             ${await time(library)}`);
    console.log(`first page              ${await time(() => loadPage(ws.id, null))}`);
    console.log(`listRows (all 2,000)    ${await time(() => listRows(ws.id))}`);
    console.log(`readStamp               ${await time(() => readStamp(ws.id))}`);
    console.log(`quotaStatus             ${await time(() => quotaStatus(ws))}`);

    const kb = (v: unknown) => `${(Buffer.byteLength(JSON.stringify(v)) / 1024).toFixed(1)} KB`;
    const bytes = (v: unknown) => `${Buffer.byteLength(JSON.stringify(v))} B`;
    const first = await loadPage(ws.id, null);
    let all: Mirror = { ...first };
    for (let cursor = first.cursor; cursor;) { const page = await loadPage(ws.id, cursor); all = applyPage(all, page); cursor = page.cursor; }
    console.log(`\nfirst page (${first.items.length} refs)    ${kb(first)}`);
    console.log(`all ${all.items.length} refs          ${kb(all)}`);
    console.log(`loadLibrary             ${kb(await library())}`);
    const ask = { ...(await readStamp(ws.id)), bell: await latestTeamEvent(ws.id, user.id) };
    const idle = await pulse(user, ws, ask);
    console.log(`pulse, nothing changed  ${bytes(idle)} (${Object.keys(idle).join(", ")})`);
    console.log(`pulse, nothing changed  ${await time(() => pulse(user, ws, ask))}`);
    await db.execute(sql`update inspo_item set name = 'Renamed', updated_at = now() where id = ${`${ws.id}-7`}`);
    const one = await pulse(user, ws, ask);
    console.log(`pulse, one ref changed  ${bytes(one)} (${one.changed?.items.length ?? 0} ref)`);

    const plan = async (label: string, q: ReturnType<typeof sql>) => {
      const { rows } = await db.execute<{ "QUERY PLAN": string }>(sql`explain (analyze, buffers off, summary on) ${q}`);
      console.log(`\n${label}\n${rows.map((r) => `  ${r["QUERY PLAN"]}`).join("\n")}`);
    };
    await plan("listRows", sql`select * from inspo_item where organization_id = ${ws.id} order by date collate "C" desc, created_at desc`);
    await plan("ownsAnyThumbnail", sql`select id from inspo_item where organization_id in (${ws.id}) and thumbnail_url = ${`/api/files/${ws.id}/7.png`} limit 1`);
    await plan("first page", sql`select * from inspo_item where organization_id = ${ws.id} order by date collate "C" desc, created_at desc, id collate "C" desc limit 301`);
    await plan("readStamp (items)", sql`select concat_ws(':', count(*), max(updated_at)) from inspo_item where organization_id = ${ws.id}`);
    await plan("pulse (changed items)", sql`select id from inspo_item where organization_id = ${ws.id} and updated_at > now() - interval '20 seconds'`);
    await plan("search quota", sql`select count(distinct lower(trim(ref))) from ai_usage where organization_id = ${ws.id} and action = 'jev_search' and created_at >= date_trunc('month', now())`);
  } finally {
    // Spend outlives its workspace (migration 0038): dropped first, while it still names the bench's
    await db.execute(sql`delete from ai_usage where organization_id like ${`${tag}-%`}`);
    await db.execute(sql`delete from organization where id like ${`${tag}-%`}`);
    await db.execute(sql`delete from "user" where id = ${user.id}`);
    await db.execute(sql`delete from library_tombstone where organization_id like ${`${tag}-%`}`);
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
