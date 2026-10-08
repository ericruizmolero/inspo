// Copies one workspace's content into another: references, projects (with their board, polish votes and system),
// comments and the stored files they point to. The source is left as it is.
//   npx tsx scripts/copy-workspace.ts <fromWorkspaceId> <toWorkspaceId> [--apply]
// Without --apply it only says what it would do. Reads PROD_DATABASE_URL (or DATABASE_URL) from .env.local and the
// R2_* variables from .env.local or from the file COPY_ENV points to (`vercel env pull <file> --environment production`).
// What is skipped: a reference whose address the target already has (its projects and comments still land on the
// target's own copy), a project the target already has by name (nothing of it is copied), AI usage, keys, activity.
import { config as loadEnv } from "dotenv";
// The storage variables may live in another file (COPY_ENV); the database one is PROD_DATABASE_URL from .env.local
if (process.env.COPY_ENV) loadEnv({ path: process.env.COPY_ENV });
loadEnv({ path: ".env.local" });
import pg from "pg";
import { S3Client, CopyObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

async function main() {
  const [from, to, flag] = process.argv.slice(2);
  if (!from || !to || from === to) throw new Error("usage: copy-workspace.ts <fromWorkspaceId> <toWorkspaceId> [--apply]");
  const apply = flag === "--apply";
  const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  // Without storage credentials (Vercel keeps them sensitive: `vercel env pull` writes them empty) the files cannot be
  // copied, and the copied rows keep pointing at the source workspace's files: a member of the source reads them
  // (app/api/files), anyone else in the target does not, and a file the source deletes is gone for the copy too
  const canCopy = !!(process.env.R2_BUCKET && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
  const FROM = `/api/files/inspo/${from}/`, TO = canCopy ? `/api/files/inspo/${to}/` : `/api/files/inspo/${from}/`;

  const db = new pg.Client({ connectionString: process.env.PROD_DATABASE_URL ?? process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const q = async <T = Record<string, unknown>>(text: string, params: unknown[] = []) => (await db.query(text, params)).rows as T[];

  const [src] = await q<{ name: string }>(`select name from organization where id=$1`, [from]);
  const [dst] = await q<{ name: string }>(`select name from organization where id=$1`, [to]);
  if (!src || !dst) throw new Error("workspace not found");
  console.log(`${apply ? "COPYING" : "dry run:"} "${src.name}" (${from}) → "${dst.name}" (${to})`);

  // ── References ─────────────────────────────────────────────────────────────
  type Item = { id: string; name: string; web: string; web_key: string; thumbnail_url: string | null };
  const items = await q<Item>(`select id, name, web, web_key, thumbnail_url from inspo_item where organization_id=$1 order by created_at`, [from]);
  const there = await q<{ id: string; web_key: string }>(`select id, web_key from inspo_item where organization_id=$1`, [to]);
  const byKey = new Map(there.map((r) => [r.web_key, r.id]));
  const itemMap = new Map<string, string>(); // source item id → target item id
  const newItems: Item[] = [];
  const OWN = `/api/files/inspo/${to}/`;
  for (const it of items) {
    // Already there under the source's path (a copy that kept pointing at the source's files) or under its own
    // (a file of the target's own, a template seeded in both)
    const had = byKey.get(it.web_key) ?? byKey.get(it.web_key.split(FROM.toLowerCase()).join(OWN.toLowerCase()));
    if (had) itemMap.set(it.id, had);
    else { const id = newId(); itemMap.set(it.id, id); byKey.set(it.web_key.split(FROM.toLowerCase()).join(TO.toLowerCase()), id); newItems.push({ ...it, id }); }
  }
  console.log(`references: ${items.length} in source, ${items.length - newItems.length} already there, ${newItems.length} to copy`);

  // ── Projects ───────────────────────────────────────────────────────────────
  const projects = await q<{ id: string; name: string }>(`select id, name from project where organization_id=$1 order by created_at`, [from]);
  const names = new Set((await q<{ name: string }>(`select name from project where organization_id=$1`, [to])).map((r) => r.name));
  const newProjects = projects.filter((p) => !names.has(p.name)).map((p) => ({ ...p, newId: newId() }));
  console.log(`projects: ${projects.length} in source, ${projects.length - newProjects.length} already there by name, to copy: ${newProjects.map((p) => `"${p.name}"`).join(", ") || "none"}`);

  // ── Comments ───────────────────────────────────────────────────────────────
  type Comment = { id: string; item_id: string; parent_id: string | null; attachments: unknown };
  const comments = await q<Comment>(`select id, item_id, parent_id, attachments from inspo_comment where organization_id=$1 order by created_at`, [from]);
  console.log(`comments: ${comments.length}`);
  const whys = await q<{ id: string }>(`select id from design_why where organization_id=$1`, [from]);

  // ── Stored files the copied rows point to ──────────────────────────────────
  const keys = new Set<string>();
  const take = (s: string | null | undefined) => { for (const m of String(s ?? "").matchAll(new RegExp(`${FROM.replace(/[/]/g, "\\/")}([^"'\\s]+)`, "g"))) keys.add(m[1]); };
  for (const it of newItems) { take(it.web); take(it.thumbnail_url); }
  for (const c of comments) take(JSON.stringify(c.attachments));
  console.log(`stored files to copy in R2: ${keys.size}${canCopy ? "" : " (no R2 credentials: the rows will point at the source's files instead)"}`);

  // ── Files first: the copy is idempotent and a row never points at nothing ──
  if (apply && keys.size && canCopy) {
    const bucket = process.env.R2_BUCKET!;
    const s3 = new S3Client({ region: "auto", endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! } });
    let copied = 0, present = 0, missing = 0;
    for (const rel of keys) {
      const source = `inspo/${from}/${rel}`, target = `inspo/${to}/${rel}`;
      try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: target })); present++; continue; } catch { /* not there yet */ }
      try { await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: source })); }
      catch { missing++; console.warn(`  missing in source: ${source}`); continue; }
      await s3.send(new CopyObjectCommand({ Bucket: bucket, CopySource: `/${bucket}/${encodeURI(source)}`, Key: target }));
      copied++;
    }
    console.log(`files: ${copied} copied, ${present} were already there, ${missing} missing in the source`);
  }

  if (!apply) { console.log("nothing written (add --apply)"); await db.end(); process.exit(0); }

  await db.query("begin");
  try {
    for (const it of newItems) {
      const [old] = items.filter((x) => itemMap.get(x.id) === it.id);
      await db.query(`insert into inspo_item (id, organization_id, name, web, web_key, date, type, author, created_by, note, sub_note, thumbnail_url, tags_json, created_at, updated_at, tags_user, tag_status, tag_attempts, tag_started_at, tag_error, embedding, embedding_at, via, source)
        select $1, $2, name, replace(web, $4, $5), replace(web_key, lower($4), lower($5)), date, type, author, created_by, note, sub_note, replace(thumbnail_url, $4, $5), tags_json, created_at, updated_at, tags_user, tag_status, tag_attempts, tag_started_at, tag_error, embedding, embedding_at, via, source
        from inspo_item where id=$3`, [it.id, to, old.id, FROM, TO]);
    }
    for (const p of newProjects) {
      await db.query(`insert into project (id, organization_id, name, created_by, created_at, updated_at, polish, template, recipe, started_at)
        select $1, $2, name, created_by, created_at, updated_at, polish, template, recipe, started_at from project where id=$3`, [p.newId, to, p.id]);
      const links = await q<{ item_id: string }>(`select item_id from project_item where project_id=$1`, [p.id]);
      for (const l of links) {
        await db.query(`insert into project_item (project_id, item_id, organization_id, added_by, created_at, archived_at, why)
          select $1, $2, $3, added_by, created_at, archived_at, why from project_item where project_id=$4 and item_id=$5 on conflict do nothing`, [p.newId, itemMap.get(l.item_id), to, p.id, l.item_id]);
      }
      await db.query(`insert into project_system (project_id, organization_id, summary, run_json, created_at, updated_at, doc, brand)
        select $1, $2, summary, run_json, created_at, updated_at, doc, brand from project_system where project_id=$3`, [p.newId, to, p.id]);
      await db.query(`insert into system_area (project_id, organization_id, area, decision, confidence, evidence, source, decided_by, updated_at, why, curation_json, never)
        select $1, $2, area, decision, confidence, evidence, source, decided_by, updated_at, why, curation_json, never from system_area where project_id=$3`, [p.newId, to, p.id]);
      const revs = await q<{ id: string }>(`select id from system_area_revision where project_id=$1`, [p.id]);
      for (const r of revs) {
        await db.query(`insert into system_area_revision (id, project_id, organization_id, area, decision, confidence, evidence, source, author_id, author_name, created_at, why)
          select $1, $2, $3, area, decision, confidence, evidence, source, author_id, author_name, created_at, why from system_area_revision where id=$4`, [newId(), p.newId, to, r.id]);
      }
      const votes = await q<{ item_id: string; user_id: string }>(`select item_id, user_id from polish_vote where project_id=$1`, [p.id]);
      for (const v of votes) {
        await db.query(`insert into polish_vote (project_id, item_id, user_id, organization_id, vote, updated_at, closed_at, closed_by)
          select $1, $2, user_id, $3, vote, updated_at, closed_at, closed_by from polish_vote where project_id=$4 and item_id=$5 and user_id=$6 on conflict do nothing`, [p.newId, itemMap.get(v.item_id), to, p.id, v.item_id, v.user_id]);
      }
    }
    // Comments, parents before replies (they come ordered by creation)
    const commentMap = new Map<string, string>();
    for (const c of comments) {
      // Already copied by an earlier run (same reference, author and moment): keep that one
      const [had] = await q<{ id: string }>(`select n.id from inspo_comment n join inspo_comment o on o.id=$1 where n.organization_id=$2 and n.item_id=$3 and n.body=o.body and n.created_at=o.created_at and n.author_name=o.author_name`, [c.id, to, itemMap.get(c.item_id)]);
      if (had) { commentMap.set(c.id, had.id); continue; }
      const id = newId(); commentMap.set(c.id, id);
      await db.query(`insert into inspo_comment (id, organization_id, item_id, author_id, author_name, body, attachments, created_at, edited_at, anchor_x, anchor_y, anchor_h, parent_id)
        select $1, $2, $3, author_id, author_name, body, replace(attachments::text, $5, $6)::jsonb, created_at, edited_at, anchor_x, anchor_y, anchor_h, $7 from inspo_comment where id=$4`,
        [id, to, itemMap.get(c.item_id), c.id, FROM, TO, c.parent_id ? commentMap.get(c.parent_id) ?? null : null]);
    }
    for (const w of whys) {
      await db.query(`insert into design_why (id, organization_id, url, stamp, model, why_json, created_at)
        select $1, $2, url, stamp, model, why_json, created_at from design_why o where o.id=$3
        and not exists (select 1 from design_why n where n.organization_id=$2 and n.url=o.url and n.stamp=o.stamp)`, [newId(), to, w.id]);
    }
    await db.query("commit");
    console.log(`done: ${newItems.length} references, ${newProjects.length} projects, ${comments.length} comments, ${whys.length} design notes`);
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    await db.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
