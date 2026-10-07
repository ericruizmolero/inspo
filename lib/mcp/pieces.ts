// What an AI client reads and writes through the MCP connector (lib/mcp/tools.ts), on the same functions the
// app's own buttons call. One rule holds for every writer of a project, this one included: nothing is written as
// a loose document. A client reads criterio.md, which is a view, and writes pieces: a reference on the board
// (a site, a picture, a text), or a change to an area's
// decision, which is never written straight in: it waits under its area as a proposal for the team's yes or no.
import "server-only";
import { after } from "next/server";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError, type Workspace } from "../workspace-core";
import { loadProjects, createProject, fileItems } from "../projects";
import { loadSystems, getSystem, assignEvidence } from "../system";
import { loadShareView } from "../share-view";
import { blocksToMd } from "../criterio-md";
import { addItem, findByWeb, rowToItem, setTags, setThumbnail, tagsOfRow, ITEM_COLUMNS } from "../items";
import { addComment, listItemComments } from "../comments";
import { refInfoOf } from "../ref-info";
import { dictOf } from "../i18n";
import { nameFor } from "../item-name";
import { normalizeWebUrl, typeFromUrl, mediaKindOf, nameFromFile } from "../url";
import { ensurePost, postThumb } from "../posts";
import { taggerEnabled } from "../tagger";
import { startTagJob } from "../tag-jobs";
import { embedItems } from "../embed";
import { fetchFile } from "../remote-file";
import { MEDIA_TYPES, MAX_MEDIA_BYTES, newMediaKey } from "../media";
import { putFile } from "../storage";
import { cleanText, putText, readText, textTags, deleteTextFile, TEXT_TITLE_MAX } from "../text-refs";
import { addAreaComment, systemActivity } from "../area-comments";
import { saveBrief } from "../brief";
import { SYSTEM_AREAS, cleanDecision, NEVER_MAX, type SystemArea } from "@/types/system";
import type { McpCtx } from "./auth";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;

/** The address of a project's system in the app, for the person to open */
const projectUrl = (origin: string, projectId: string) => `${origin}/?in=${projectId}&view=system`;
const authorOf = (ctx: McpCtx) => ({ id: ctx.user.id, name: ctx.user.name || ctx.user.email, image: ctx.user.image ?? null });

// ─── Projects ────────────────────────────────────────────────────────────────

/** Every project of every workspace the person is in */
export async function listProjects(ctx: McpCtx, origin: string) {
  const per = await Promise.all(ctx.workspaces.map(async (w) => {
    const [{ projects, links }, systems] = await Promise.all([loadProjects(w.id), loadSystems(w.id)]);
    const refs: Record<string, number> = {};
    for (const ids of Object.values(links)) for (const id of ids) refs[id] = (refs[id] ?? 0) + 1;
    return projects.map((p) => ({
      id: p.id, name: p.name, workspace: w.name,
      ...(p.intent ? { about: p.intent } : {}),
      areas_decided: `${systems[p.id]?.areas.filter((a) => a.decision).length ?? 0} of ${SYSTEM_AREAS.length}`,
      references: refs[p.id] ?? 0,
      url: projectUrl(origin, p.id),
    }));
  }));
  return per.flat();
}

/** A project by its id or by its name, in any of the person's workspaces. A name has to point at one project. */
export async function resolveProject(ctx: McpCtx, ref: string): Promise<{ id: string; name: string; workspace: Workspace }> {
  const key = String(ref ?? "").trim();
  if (!key) throw new HttpError(400, "Which project? Pass its id or its name (list_projects shows them).");
  const rows = await db.select({ id: P.id, name: P.name, organizationId: P.organizationId }).from(P)
    .where(and(inArray(P.organizationId, ctx.workspaces.map((w) => w.id)), isNull(P.template)));
  const low = key.toLowerCase();
  let hits = rows.filter((r) => r.id === key);
  if (!hits.length) hits = rows.filter((r) => r.name.toLowerCase() === low);
  if (!hits.length) hits = rows.filter((r) => r.name.toLowerCase().includes(low));
  if (!hits.length) throw new HttpError(404, `No project matches "${key}". Call list_projects to see the ones there are.`);
  if (hits.length > 1) throw new HttpError(409, `Several projects match "${key}": ${hits.map((h) => `${h.name} (${h.id})`).join(", ")}. Pass the id.`);
  return { id: hits[0].id, name: hits[0].name, workspace: ctx.workspaces.find((w) => w.id === hits[0].organizationId)! };
}

/** Where a new project goes when the client names no workspace: the only one, or the only team */
function resolveWorkspace(ctx: McpCtx, ref: string | undefined): Workspace {
  const key = ref?.trim().toLowerCase();
  if (key) {
    const hit = ctx.workspaces.find((w) => w.id === ref!.trim()) ?? ctx.workspaces.find((w) => w.name.toLowerCase() === key);
    if (!hit) throw new HttpError(404, `No workspace "${ref}". The person is in: ${ctx.workspaces.map((w) => w.name).join(", ")}.`);
    return hit;
  }
  if (ctx.workspaces.length === 1) return ctx.workspaces[0];
  const teams = ctx.workspaces.filter((w) => w.kind === "team");
  if (teams.length === 1) return teams[0];
  throw new HttpError(409, `Which workspace? The person is in: ${ctx.workspaces.map((w) => w.name).join(", ")}. Ask them and pass it as "workspace".`);
}

export async function newProject(ctx: McpCtx, origin: string, input: { name: string; about?: string; workspace?: string }) {
  const workspace = resolveWorkspace(ctx, input.workspace);
  const project = await createProject(workspace.id, input.name, ctx.user.id);
  if (input.about?.trim()) await saveBrief(workspace.id, project.id, { about: input.about.trim() }, ctx.user.id);
  return { id: project.id, name: project.name, workspace: workspace.name, url: projectUrl(origin, project.id) };
}

// ─── Reading ─────────────────────────────────────────────────────────────────

export const CRITERIO_SECTIONS = ["all", "decisions", ...SYSTEM_AREAS] as const;
export type CriterioSection = (typeof CRITERIO_SECTIONS)[number];

/**
 * criterio.md as the team reads it, in the person's language. "decisions" leaves out the long tail (every
 * reference's own entry and the texts, whole); an area's name gives that area alone.
 */
export async function readCriterio(ctx: McpCtx, origin: string, ref: string, section: CriterioSection = "all") {
  const project = await resolveProject(ctx, ref);
  const view = await loadShareView(project.workspace.id, project.id, "full", ctx.user.language, null, origin);
  if (!view) throw new HttpError(404, "That project is gone.");
  if (section === "all") return view.markdown;
  const blocks = view.blocks.filter((b) => section === "decisions"
    ? b.kind !== "section" || !["refs", "content"].includes(b.id)
    : b.kind === "area" && b.area === section);
  return blocksToMd(blocks);
}

/** The project's board: each reference with the code criterio.md cites it by (R1, R2…), oldest first */
export async function listReferences(ctx: McpCtx, ref: string) {
  const project = await resolveProject(ctx, ref);
  const org = project.workspace.id;
  const [rows, system] = await Promise.all([
    db.select({ id: T.id, name: T.name, web: T.web, source: T.source, author: T.author, via: T.via, note: T.note })
      .from(PI).innerJoin(T, eq(T.id, PI.itemId))
      .where(and(eq(PI.organizationId, org), eq(PI.projectId, project.id))).orderBy(asc(PI.createdAt)),
    getSystem(org, project.id),
  ]);
  const areasOf: Record<string, SystemArea[]> = {};
  for (const a of system.areas) for (const e of a.evidence) (areasOf[e.itemId] ??= []).push(a.area);
  return {
    project: { id: project.id, name: project.name },
    references: rows.map((r, i) => {
      const kind = mediaKindOf(r.web);
      return {
        id: r.id, code: `R${i + 1}`, name: r.name, kind,
        // A stored file (a picture, a text) has no address outside the app: a picture found on a page gives that page
        ...(kind === "image" || kind === "text" ? {} : { url: r.web }),
        ...(r.source ? { source: r.source } : {}),
        saved_by: r.via ? `${r.author} (via ${r.via})` : r.author,
        ...(r.note.trim() ? { note: r.note.trim() } : {}),
        ...(areasOf[r.id]?.length ? { areas: areasOf[r.id] } : {}),
      };
    }),
  };
}

/** One reference, whole: what it is, what the AI read in it, what the team said on it, and a text's words */
export async function readReference(ctx: McpCtx, id: string) {
  const [row] = await db.select(ITEM_COLUMNS).from(T).where(and(eq(T.id, String(id ?? "").trim()), inArray(T.organizationId, ctx.workspaces.map((w) => w.id)))).limit(1);
  if (!row) throw new HttpError(404, `No reference with id "${id}". list_references gives the ids of a project's references.`);
  const item = rowToItem(row);
  const kind = mediaKindOf(row.web);
  const [comments, filed, text] = await Promise.all([
    listItemComments(row.organizationId, row.id),
    db.select({ id: P.id, name: P.name }).from(PI).innerJoin(P, eq(P.id, PI.projectId)).where(and(eq(PI.organizationId, row.organizationId), eq(PI.itemId, row.id))),
    kind === "text" ? readText(row.web) : Promise.resolve(null),
  ]);
  const info = refInfoOf(item, tagsOfRow(row) ?? undefined, comments, dictOf(ctx.user.language));
  return {
    id: row.id, name: row.name, kind,
    ...(kind === "image" || kind === "text" ? {} : { url: row.web }),
    ...(row.source ? { source: row.source } : {}),
    saved_by: row.via ? `${row.author} (via ${row.via})` : row.author, saved_on: info.date,
    ...(info.what ? { what_it_is: info.what } : {}),
    ...(info.tags?.length ? { tags: info.tags } : {}),
    projects: filed.map((f) => ({ id: f.id, name: f.name })),
    ...(info.said?.length ? { said: info.said.map((s) => ({ who: s.who, text: s.text })) } : {}),
    ...(text ? { text } : {}),
  };
}

// ─── Writing ─────────────────────────────────────────────────────────────────

const IMAGE_FILE = /\.(png|jpe?g|webp|gif|avif)$/i;
const cleanAreas = (v: readonly string[] | undefined): SystemArea[] => [...new Set((v ?? []).filter((a): a is SystemArea => (SYSTEM_AREAS as readonly string[]).includes(a)))];
const oneLine = (s: string | undefined, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export interface NewPiece {
  project: string;
  /** A site, a video, a post, or a picture's own address: one of this or `text` */
  url?: string;
  /** Words kept whole (Markdown): one of this or `url` */
  text?: string;
  title?: string;
  /** Why it is there, in the person's words: the first thing its card says */
  note?: string;
  /** The areas of the system it brings something to */
  areas?: readonly string[];
}

/**
 * Saves a reference on a project's board, signed with the person's name and the app it came from. A site already
 * in the library is not saved twice: it is filed in the project and the rest (areas) still applies.
 */
export async function addPiece(ctx: McpCtx, origin: string, input: NewPiece) {
  const project = await resolveProject(ctx, input.project);
  const org = project.workspace.id;
  const author = authorOf(ctx);
  const hasUrl = !!input.url?.trim(), hasText = !!input.text?.trim();
  if (hasUrl === hasText) throw new HttpError(400, "Pass exactly one of url or text.");
  const note = oneLine(input.note, 500);
  const base = { author: author.name, createdBy: author.id, note, via: ctx.via };
  let itemId: string, name: string, existed = false;

  if (hasText) {
    const text = cleanText(input.text);
    // No title given: its first line, without Markdown's marks
    const title = oneLine(input.title, TEXT_TITLE_MAX) || oneLine(text.split("\n").find((l) => l.trim())?.replace(/^[#>\-*\s]+/, "").replace(/[*_`]/g, ""), TEXT_TITLE_MAX);
    if (!text || !title) throw new HttpError(400, "The text is empty.");
    const url = await putText(org, text);
    try {
      const item = await addItem(org, { ...base, name: title, web: url, type: "inspiration" });
      await setTags(org, item.web, await textTags(item.web));
      itemId = item.id!; name = item.name;
    } catch (e) {
      await deleteTextFile(org, url).catch(() => {});
      throw e;
    }
    const id = itemId;
    after(() => embedItems([id]).catch((e) => console.warn("embed: left for the worker", e instanceof Error ? e.message : e)));
  } else {
    const web = normalizeWebUrl(input.url!);
    if (!web) throw new HttpError(400, `"${input.url}" is not an address that can be saved.`);
    // A picture's own address: the picture is copied, so the board shows it whatever its site does later
    const image = IMAGE_FILE.test(new URL(web).pathname) ? await fetchFile(web, undefined, (t) => MEDIA_TYPES.has(t), MAX_MEDIA_BYTES) : null;
    if (image) {
      const url = await putFile(newMediaKey(org, image.type), image.body, image.type);
      const item = await addItem(org, { ...base, name: oneLine(input.title, 80) || nameFromFile(new URL(web).pathname.split("/").pop() ?? "") || "Image", web: url, thumbnailUrl: url, source: web, type: "inspiration" });
      itemId = item.id!; name = item.name;
      if (taggerEnabled()) after(() => startTagJob(org, itemId, author.id));
    } else {
      const existing = await findByWeb(org, web);
      if (existing) {
        itemId = existing.id; name = existing.name; existed = true;
        // Already in the library, with someone's note on it: why it is here now goes in its thread
        if (note) await addComment(org, { itemId, authorId: author.id, authorName: author.name, body: note });
      }
      else {
        const item = await addItem(org, { ...base, name: oneLine(input.title, 80) || await nameFor(web), web, type: typeFromUrl(web) });
        itemId = item.id!; name = item.name;
        // As when a URL is pasted in the app: a post on X is imported, and the AI tags what was saved
        const isPost = mediaKindOf(web) === "post";
        if (isPost || taggerEnabled()) {
          after(async () => {
            if (isPost) { const post = await ensurePost(web); const thumb = post && postThumb(post); if (thumb) await setThumbnail(org, web, thumb); }
            if (taggerEnabled()) await startTagJob(org, itemId, author.id);
          });
        }
      }
    }
  }

  await fileItems(org, project.id, [itemId], author.id);
  const areas = cleanAreas(input.areas);
  for (const area of areas) await assignEvidence(org, project.id, area, itemId, true, author);
  return {
    id: itemId, name, project: project.name,
    ...(existed ? { already_in_library: true } : {}),
    ...(areas.length ? { areas } : {}),
    url: projectUrl(origin, project.id),
  };
}

export interface NewProposal {
  project: string; area: string;
  /** The text the area would have */
  decision: string;
  why?: string;
  /** What the area must never do, one rule each */
  never?: readonly string[];
  /** What the team reads next to the proposal: where it comes from */
  reason?: string;
}

/**
 * A change to an area's decision, left as a proposal under the area: it is the team's to accept or reject in the
 * app. The area keeps saying what it said until someone accepts.
 */
export async function proposeDecision(ctx: McpCtx, origin: string, input: NewProposal) {
  const project = await resolveProject(ctx, input.project);
  const org = project.workspace.id;
  if (!(SYSTEM_AREAS as readonly string[]).includes(input.area)) throw new HttpError(400, `"${input.area}" is not an area. The areas are: ${SYSTEM_AREAS.join(", ")}.`);
  const area = input.area as SystemArea;
  const decision = cleanDecision(input.decision);
  if (!decision) throw new HttpError(400, "The decision is empty.");
  const why = oneLine(input.why, 400);
  const never = (input.never ?? []).map((l) => oneLine(l, 200)).filter(Boolean).join("\n").slice(0, NEVER_MAX);
  const [system, activity] = await Promise.all([getSystem(org, project.id), systemActivity(org, project.id, ctx.user.id)]);
  const current = system.areas.find((a) => a.area === area);
  if (current?.decision.trim() === decision && (!never || never === current.never)) {
    return { proposed: false, reason: "The area already says exactly this.", project: project.name, area, url: projectUrl(origin, project.id) };
  }
  // The same text already waiting is not proposed twice (a client retrying, or asked again in another chat)
  const waiting = (activity.notes[area] ?? []).find((n) => n.proposal?.state === "open" && n.proposal.decision === decision);
  if (waiting) return { proposed: false, reason: "This same text is already waiting for the team's answer.", project: project.name, area, url: projectUrl(origin, project.id) };
  const note = await addAreaComment(org, project.id, area, oneLine(input.reason, 600) || decision, authorOf(ctx), { proposal: { decision, why, never, state: "open", via: ctx.via } });
  return {
    proposed: true, id: note.id, project: project.name, area,
    status: "Waiting for the team: someone accepts or rejects it in the app. The area says what it said until then.",
    ...(current?.decision ? { current_decision: current.decision } : {}),
    url: projectUrl(origin, project.id),
  };
}
