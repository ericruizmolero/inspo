// Everything the library needs to show one workspace. Used by the library layout on a page load, and by
// /api/library so the client can have the other workspaces ready before a switch. The references come a page at a
// time (loadPage, /api/library/page) and what changes afterwards through the pulse (lib/pulse.ts).
import "server-only";
import { and, desc, eq, gt, sql, type SQL } from "drizzle-orm";
import { db, schema } from "./db";
import { ITEM_COLUMNS, shapeRows, type ItemRow } from "./items";
import { loadProjects } from "./projects";
import { TEMPLATE_AUTHOR } from "./sample-items";
import type { ItemsBundle, ItemsPage, ProjectLinks } from "@/types/inspo";
import { loadSystemSummaries } from "./system";
import { isAdmin } from "./activity";
import { quotaStatus } from "./quota";
import { listCommentsOf } from "./comments";
import { listVotes } from "./polish-votes";
import { latestTeamEvent } from "./notify";
import { designDocsFor } from "./design-store";
import { pageShotsFor, signCanvasCopies } from "./page-shots";
import { keyOf, signedFileUrl } from "./storage";
import { mediaKindOf } from "./url";
import { HttpError, listMembers, type SessionUser, type Workspace } from "./workspace-core";

const T = schema.inspoItem, PI = schema.projectItem, P = schema.project;

/** References per page: the first comes with the page load, the rest one after another right after it */
export const PAGE = 300;

export async function loadLibrary(user: SessionUser, ws: Workspace) {
  // Taken before reading: whatever changes while this loads is newer than `since`, and the pulse brings it
  const head = await readStamp(ws.id);
  const [first, board, systems, members, admin, quota, bell] = await Promise.all([
    loadPage(ws.id, null),
    boardState(ws.id),
    loadSystemSummaries(ws.id),
    listMembers(ws.id),
    isAdmin(user.email),
    quotaStatus(ws),
    bellOf(ws, user.id),
  ]);
  return {
    workspace: ws,
    ...head,
    bell,
    first,
    initialProjects: board.projects,
    initialProjectLinks: board.links,
    initialSummaries: systems,
    members: members.map((m) => ({ id: m.userId, name: m.name, image: m.image ?? null })),
    initialPolishVotes: board.votes,
    isAdmin: admin,
    initialQuota: quota,
  };
}

export type LibraryData = Awaited<ReturnType<typeof loadLibrary>>;

/** The workspace's projects, which references each one holds, and the polish votes. A template is not one of the
 *  workspace's projects: its links and votes stay out with it */
export async function boardState(organizationId: string) {
  const [{ projects, links: all }, votes] = await Promise.all([loadProjects(organizationId), listVotes(organizationId)]);
  const real = new Set(projects.map((p) => p.id));
  const links: ProjectLinks = Object.fromEntries(Object.entries(all).map(([id, ps]) => [id, ps.filter((p) => real.has(p))] as const).filter(([, ps]) => ps.length));
  return { projects, links, votes: votes.filter((v) => real.has(v.projectId)) };
}

/** What only a template holds is not in the library: the references a built-in template brought show up when a
 *  project is cloned from it, and not before. Every read of the library's references goes through this */
const shownInLibrary = sql`not (${T.author} = ${TEMPLATE_AUTHOR} and not exists (
  select 1 from ${PI} join ${P} on ${P.id} = ${PI.projectId} and ${P.template} is null where ${PI.itemId} = ${T.id}))`;

// The library's order, newest first. `id` breaks the ties of references added in the same instant
const ORDER = [desc(sql`${T.date} collate "C"`), desc(T.createdAt), desc(sql`${T.id} collate "C"`)];

/** Where a page ended: the last row's three keys, `created_at` as Postgres wrote it (a JS date drops microseconds) */
type Cursor = [date: string, createdAt: string, id: string];
const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString("base64url");
function decodeCursor(s: string): Cursor {
  try {
    const c: unknown = JSON.parse(Buffer.from(s, "base64url").toString("utf8"));
    if (Array.isArray(c) && c.length === 3 && c.every((v) => typeof v === "string") && !isNaN(Date.parse(c[1]))) return c as Cursor;
  } catch { /* falls to the error below */ }
  throw new HttpError(400, "bad cursor");
}

/** One page of the library: PAGE references after `cursor` (from the newest with null), and the next cursor */
export async function loadPage(organizationId: string, cursor: string | null): Promise<ItemsPage> {
  const after = cursor ? decodeCursor(cursor) : null;
  const where: SQL[] = [eq(T.organizationId, organizationId), shownInLibrary];
  if (after) where.push(sql`(${T.date} collate "C", ${T.createdAt}, ${T.id} collate "C") < (${after[0]} collate "C", ${after[1]}::timestamptz, ${after[2]} collate "C")`);
  const rows = await db.select({ ...ITEM_COLUMNS, at: sql<string>`${T.createdAt}::text` }).from(T).where(and(...where)).orderBy(...ORDER).limit(PAGE + 1);
  const page = rows.slice(0, PAGE);
  const last = page[page.length - 1];
  const [bundle, comments] = await Promise.all([bundleOf(organizationId, page), listCommentsOf(organizationId, page.map((r) => r.id))]);
  return { ...bundle, comments, cursor: rows.length > PAGE ? encodeCursor([last.date, last.at, last.id]) : null };
}

/** The references written since `after` (added, edited, tagged, a new thumbnail), in the page's shape */
export async function itemsChangedSince(organizationId: string, after: Date): Promise<ItemsBundle> {
  const rows = await db.select(ITEM_COLUMNS).from(T).where(and(eq(T.organizationId, organizationId), gt(T.updatedAt, after), shownInLibrary)).orderBy(...ORDER);
  return bundleOf(organizationId, rows);
}

/** Rows as the board draws them: with each site's page capture and DESIGN.md entry, read only for these addresses */
async function bundleOf(organizationId: string, rows: ItemRow[]): Promise<ItemsBundle> {
  const { items, thumbnailMap, tagMap, tagJobs } = shapeRows(rows);
  const webs = items.map((i) => i.web);
  const [designMdIndex, pageShots] = webs.length ? await Promise.all([designDocsFor(webs), pageShotsFor(webs).then(signCanvasCopies)]) : [{}, {}];
  const signed = await signedLinks([
    ...Object.values(thumbnailMap), ...webs.filter((w) => mediaKindOf(w) === "image"),
    ...Object.values(designMdIndex).flatMap((d) => [d.coverUrl, d.scrollUrl]),
  ]);
  return { items, thumbnailMap, tagMap, tagJobs, pageShots, designMdIndex, signed };
}

/** The board's other images as signed R2 links, keyed by their stored path: the browser loads them straight from the
 *  bucket instead of through /api/files, one function each. Only this bundle's rows get here, so only what the
 *  workspace may see is signed. A path that fails to sign, and every path on disk, is left out: the card loads the path */
async function signedLinks(paths: (string | undefined)[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all([...new Set(paths)].map(async (p) => {
    const k = p ? keyOf(p) : null;
    const url = k && (await signedFileUrl(k).catch(() => null))?.url;
    if (url) out[p!] = url;
  }));
  return out;
}

/** The bell's news in a team (lib/notify.ts latestTeamEvent); a personal workspace has no bell */
export const bellOf = (ws: Workspace, userId: string) => (ws.kind === "team" ? latestTeamEvent(ws.id, userId) : Promise.resolve(""));

/** The parts of the stamp, in order. lib/pulse.ts compares them one by one */
export const STAMP_PARTS = ["items", "links", "projects", "votes", "comments"] as const;

/** What the board shows, in one short string: per part, how many rows and the last time any of them changed; and
 *  `since`, the server's clock when it was read. An add, a delete, an edit, tags arriving, a filing, a new project, a
 *  vote or a comment all change it. One query on the workspace's indexes: the open board asks for it every 15 s. */
export async function readStamp(organizationId: string): Promise<{ stamp: string; since: string }> {
  const { rows } = await db.execute<{ stamp: string; since: string }>(sql`select concat_ws('|',
    (select concat_ws(':', count(*), max(updated_at)) from inspo_item where organization_id = ${organizationId}),
    (select concat_ws(':', count(*), count(archived_at), max(created_at), max(archived_at)) from project_item where organization_id = ${organizationId}),
    (select concat_ws(':', count(*), max(updated_at)) from project where organization_id = ${organizationId} and template is null),
    (select concat_ws(':', count(*), max(updated_at)) from polish_vote where organization_id = ${organizationId}),
    (select concat_ws(':', count(*), max(coalesce(edited_at, created_at))) from inspo_comment where organization_id = ${organizationId})
  ) as stamp, to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as since`);
  return { stamp: rows[0]?.stamp ?? "", since: rows[0]?.since ?? new Date().toISOString() };
}
