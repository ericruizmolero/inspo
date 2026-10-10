// How long the library takes to load for a workspace of 2,000 references, with 20 other workspaces of the same
// size around it. Prints the median of the database part of loadLibrary (the R2 indexes are left out: they are
// cached and not the database), the board's 15 s stamp and the search quota count, and the plan Postgres picks
// for each. Local database only: it refuses anything else, and deletes what it made.
//   npm run bench:library
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { performance } from "node:perf_hooks";
import { sql } from "drizzle-orm";
import { databaseUrl, LOCAL_DATABASE_URL } from "../lib/db/url";
import { db, pool } from "../lib/db";
import { loadWorkspaceData, listRows } from "../lib/items";
import { loadProjects } from "../lib/projects";
import { loadSystems } from "../lib/system";
import { listMembers } from "../lib/workspace-core";
import { isAdmin } from "../lib/activity";
import { quotaStatus } from "../lib/quota";
import { listComments } from "../lib/comments";
import { listVotes } from "../lib/polish-votes";

const ITEMS = 2_000, NOISE = 20, RUNS = 30;

async function main() {
  if (databaseUrl() !== LOCAL_DATABASE_URL) throw new Error("bench:library runs on the local database only");
  // lib/library.ts pulls in next/navigation, which does not load outside Next: the stamp's query, as it is there
  const libraryStamp = (org: string) => db.execute(sql`select concat_ws('|',
    (select concat_ws(':', count(*), max(updated_at)) from inspo_item where organization_id = ${org}),
    (select concat_ws(':', count(*), count(archived_at), max(created_at), max(archived_at)) from project_item where organization_id = ${org}),
    (select concat_ws(':', count(*), max(updated_at)) from project where organization_id = ${org} and template is null),
    (select concat_ws(':', count(*), max(updated_at)) from polish_vote where organization_id = ${org})
  ) as stamp`);

  const tag = `bench${Date.now().toString(36)}`;
  const orgs = Array.from({ length: NOISE + 1 }, (_, i) => `${tag}-${i}`);
  const ws = { id: orgs[0], plan: "studio" as const };
  try {
    await db.execute(sql`insert into organization (id, name, slug, created_at, plan)
      select o, o, o, now(), 'studio' from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w`);
    await db.execute(sql`insert into inspo_item (id, organization_id, name, web, web_key, date, author, thumbnail_url, tag_status, created_at, updated_at)
      select o || '-' || n, o, 'Ref ' || n, 'https://' || n || '.' || o || '.example', n || '.' || o || '.example',
        to_char(date '2026-01-01' + (n % 280), 'YYYY-MM-DD'), 'bench', '/api/files/' || o || '/' || n || '.png', 'done',
        now() - n * interval '1 minute', now() - n * interval '1 minute'
      from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, ${ITEMS}) n`);
    await db.execute(sql`insert into project (id, organization_id, name, created_at, updated_at)
      select o || '-p' || n, o, 'Project ' || n, now(), now() from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, 20) n`);
    await db.execute(sql`insert into project_item (project_id, item_id, organization_id, created_at)
      select o || '-p' || (n % 20 + 1), o || '-' || n, o, now() from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, ${ITEMS} / 2) n`);
    // A month of typing in the search box: 3,000 calls over 600 distinct queries
    await db.execute(sql`insert into ai_usage (id, organization_id, action, model, ref, created_at)
      select o || '-u' || n, o, 'jev_search', 'bench', 'query ' || (n % 600), date_trunc('month', now()) + (n % 600) * interval '1 minute'
      from (select ${tag} || '-' || i as o from generate_series(0, ${NOISE}) i) w, generate_series(1, 3000) n`);
    await db.execute(sql`analyze inspo_item; analyze project_item; analyze project; analyze ai_usage`);

    const time = async (f: () => Promise<unknown>) => {
      const ms: number[] = [];
      for (let i = 0; i < RUNS; i++) { const t = performance.now(); await f(); ms.push(performance.now() - t); }
      ms.sort((a, b) => a - b);
      return `median ${ms[RUNS >> 1].toFixed(1)} ms, p90 ${ms[Math.floor(RUNS * 0.9)].toFixed(1)} ms`;
    };
    const library = () => libraryStamp(ws.id).then(() => Promise.all([
      loadWorkspaceData(ws.id), loadProjects(ws.id), loadSystems(ws.id), listMembers(ws.id), isAdmin("bench@example.invalid"),
      quotaStatus(ws), listComments(ws.id), listVotes(ws.id),
    ]));
    await library();
    console.log(`loadLibrary (database)  ${await time(library)}`);
    console.log(`listRows                ${await time(() => listRows(ws.id))}`);
    console.log(`libraryStamp            ${await time(() => libraryStamp(ws.id))}`);
    console.log(`quotaStatus             ${await time(() => quotaStatus(ws))}`);

    const plan = async (label: string, q: ReturnType<typeof sql>) => {
      const { rows } = await db.execute<{ "QUERY PLAN": string }>(sql`explain (analyze, buffers off, summary on) ${q}`);
      console.log(`\n${label}\n${rows.map((r) => `  ${r["QUERY PLAN"]}`).join("\n")}`);
    };
    await plan("listRows", sql`select * from inspo_item where organization_id = ${ws.id} order by date collate "C" desc, created_at desc`);
    await plan("ownsAnyThumbnail", sql`select id from inspo_item where organization_id in (${ws.id}) and thumbnail_url = ${`/api/files/${ws.id}/7.png`} limit 1`);
    await plan("libraryStamp", sql`select concat_ws(':', count(*), max(updated_at)) from inspo_item where organization_id = ${ws.id}`);
    await plan("search quota", sql`select count(distinct lower(trim(ref))) from ai_usage where organization_id = ${ws.id} and action = 'jev_search' and created_at >= date_trunc('month', now())`);
  } finally {
    await db.execute(sql`delete from organization where id like ${`${tag}-%`}`);
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
