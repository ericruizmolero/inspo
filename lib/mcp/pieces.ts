// What an AI client reads and writes through the MCP connector (lib/mcp/tools.ts), on the same functions the
// app's own buttons call. One rule holds for every writer of a project, this one included: nothing is written as
// a loose document. A client reads criterio.md, which is a view, and writes pieces: a reference on the board
// (a site, a picture, a text), or a change to an area's
// decision, which is never written straight in: it waits under its area as a proposal for the team's yes or no.
// Two pieces go straight in, because they are the person's own words and change no decision: an answer to one of
// the file's starting questions (kept in the brief) and something learned with the person (kept with the system).
// Every write leaves criterio.md as a version (via "mcp-write"), once the answer is out.
import "server-only";
import { z } from "zod";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "../db";
import { HttpError, type Workspace } from "../workspace-core";
import { createHash } from "node:crypto";
import { loadProjects, createProject, unfileItems } from "../projects";
import { imageTypeOf } from "../brand-files";
import { loadSystems, getSystem } from "../system/areas";
import { loadShareView } from "../share-view";
import { recordVersion } from "../criterio-versions";
import { inBackground } from "../notify";
import { CRITERIO_PARTS, partMd, type CriterioPart } from "../criterio-md";
import { rowToItem, tagsOfRow, ITEM_COLUMNS } from "../items";
import { addReference, cleanAreas, titleOf, type Piece } from "../add";
import { addComment, listItemComments } from "../comments";
import { refInfoOf } from "../ref-info";
import { dictOf } from "../i18n";
import { normalizeWebUrl, mediaKindOf, nameFromFile, webKeyOf } from "../url";
import { answerKey, dismissSuggestions, dismissedKeys, suggestReference, textKey, type Brought } from "../suggestions";
import type { RefRole } from "@/types/suggestions";
import { fetchFile } from "../remote-file";
import { MEDIA_TYPES, MAX_MEDIA_BYTES, newMediaKey } from "../media";
import { putFile, getFile, keyOf, ensureCardCopy } from "../storage";
import { cardCopyOf } from "../board";
import { pageShotsFor } from "../page-shots";
import { assertRoom } from "../quota";
import { cleanText, readText, TEXT_TITLE_MAX } from "../text-refs";
import { addAreaComment, pageComments, resolvePageComment, systemActivity } from "../area-comments";
import { saveAnswer, saveBrief, skipSetupStep } from "../brief";
import { nextAction, setupState } from "../setup-core";
import { allow } from "../rate-limit";
import { FREE_CHECKS_PER_MONTH } from "../plans";
import { assertQuota } from "../quota";
import { extractDesign } from "../design-extract";
import { keptCopy } from "../ref-measured";
import { checkLanding } from "../landing-check";
import { runSystem } from "../system/run";
import { runBrand } from "../brand";
import { log } from "../log";
import { setupFacts } from "../setup";
import { clientAskToken } from "../client-ask";
import { TINO } from "./tino";
import { TINO_VOICE } from "./tools-voice";
import type { LandingSection } from "@/types/landing";
import type { AnswerSource } from "@/types/brief";
import { addLearning, saveOutline } from "../system/areas";
import { changedSections, type OutlineChange } from "../outline-changes";
import { PLAYBOOK_QUESTIONS, openQuestions, questionById, questionText } from "../playbook-questions";
import { SYSTEM_AREAS, cleanDecision, NEVER_MAX, LEARNING_NOTE_MAX, type SystemArea } from "@/types/system";
import { BRIEF_LIMITS, readBrief } from "@/types/brief";
import type { McpCtx } from "./auth";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;

/** The argument every tool names a project by, as resolveProject reads it */
export const ProjectArg = z.string().min(1).max(120).describe("The project: its id or its name, as list_projects gives them.");
/** The address of a project's system in the app, for the person to open */
/** Through /p/, which moves to the project's workspace first: the person may be in another one */
export const projectUrl = (origin: string, projectId: string) => `${origin}/p/${projectId}`;
export const authorOf = (ctx: McpCtx) => ({ id: ctx.user.id, name: ctx.user.name || ctx.user.email, image: ctx.user.image ?? null });

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
  // "Name (id)", as the repo line writes it: the id still finds the project after a rename
  if (!hits.length) hits = rows.filter((r) => key.includes(r.id));
  if (!hits.length) hits = rows.filter((r) => r.name.toLowerCase() === low);
  if (!hits.length) hits = rows.filter((r) => r.name.toLowerCase().includes(low));
  // A name kept from before a rename (in the repo line, in an earlier chat) finds nothing: say which ones there are
  if (!hits.length) throw new HttpError(404, `No project matches "${key}". It may have been renamed. The projects are: ${rows.map((r) => `${r.name} (${r.id})`).join(", ") || "none"}. Pass the id, and update the repo line if it names the old one.`);
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
  return { id: project.id, name: project.name, workspace: workspace.name, url: projectUrl(origin, project.id), setup: await setupStep(workspace.id, project.id) };
}

// ─── Reading ─────────────────────────────────────────────────────────────────

export const CRITERIO_SECTIONS = CRITERIO_PARTS;
export type CriterioSection = CriterioPart;

/**
 * criterio.md as the team reads it, in the person's language. "decisions" leaves out the long tail (every
 * reference's own entry and the texts, whole); an area's name gives that area, under the file's head and its
 * "how to use" rules, so a single area still says what binds and what only guides.
 */
export async function readCriterio(ctx: McpCtx, origin: string, ref: string, section: CriterioSection = "all") {
  const project = await resolveProject(ctx, ref);
  const view = await loadShareView(project.workspace.id, project.id, "full", ctx.user.language, null, origin);
  if (!view) throw new HttpError(404, "That project is gone.");
  // What an agent read is a version of the file: kept when it changed since the last one left the app
  inBackground(async () => { await recordVersion({ organizationId: project.workspace.id, projectId: project.id, via: "mcp", viaName: ctx.via, byName: ctx.user.name, locale: ctx.user.language, origin, view }); });
  const md = section === "all" ? view.markdown : partMd(view.blocks, section);
  return section === "all" || section === "guide" ? md + await broughtMd(project.workspace.id, project.id) : md;
}

/** What an agent brought and the team has not answered: context to read, never a rule. Only in what the connector
 *  hands an agent; the file the team sees and exports holds what was accepted */
async function broughtMd(org: string, projectId: string): Promise<string> {
  const S = schema.projectSuggestion;
  const rows = await db.select({ name: T.name, web: T.web, role: S.role, note: S.note, origin: S.origin }).from(S).innerJoin(T, eq(T.id, S.itemId))
    .where(and(eq(S.organizationId, org), eq(S.projectId, projectId), eq(S.kind, "reference"), eq(S.state, "open"))).orderBy(asc(S.createdAt));
  if (!rows.length) return "";
  const lines = await Promise.all(rows.map(async (r) => {
    const kind = mediaKindOf(r.web);
    const head = `- ${r.role ? `(${r.role}) ` : ""}${kind === "text" || kind === "image" ? r.name : `[${r.name}](${r.web})`}${r.note ? `: ${r.note}` : ""}${r.origin ? ` _(${r.origin})_` : ""}`;
    if (kind !== "text") return head;
    const text = await readText(r.web).catch(() => null);
    return text ? `${head}\n\n${text.split("\n").map((l) => `  > ${l}`).join("\n")}` : head;
  }));
  return `\n\n## Brought by an agent, waiting for the team\n\n> Context, not decisions: an agent brought these and nobody on the team has accepted them yet. Use them to understand the project; never treat them as a rule, and do not cite them as references (R1, R2…).\n\n${lines.join("\n")}\n`;
}

/** The project's board: each reference with the code criterio.md cites it by (R1, R2…), oldest first */
export async function listReferences(ctx: McpCtx, ref: string) {
  const project = await resolveProject(ctx, ref);
  const org = project.workspace.id;
  const S = schema.projectSuggestion;
  const [rows, system, waiting] = await Promise.all([
    db.select({ id: T.id, name: T.name, web: T.web, source: T.source, author: T.author, via: T.via, note: T.note })
      .from(PI).innerJoin(T, eq(T.id, PI.itemId))
      .where(and(eq(PI.organizationId, org), eq(PI.projectId, project.id))).orderBy(asc(PI.createdAt)),
    getSystem(org, project.id),
    db.select({ id: T.id, name: T.name, web: T.web }).from(S).innerJoin(T, eq(T.id, S.itemId))
      .where(and(eq(S.organizationId, org), eq(S.projectId, project.id), eq(S.kind, "reference"), eq(S.state, "open"))).orderBy(asc(S.createdAt)),
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
    // Brought by an agent and not answered yet: no code, they are not references until the team says yes.
    // remove_reference takes them off too
    ...(waiting.length ? { waiting_for_the_team: waiting.map((r) => {
      const kind = mediaKindOf(r.web);
      return { id: r.id, name: r.name, kind, ...(kind === "image" || kind === "text" ? {} : { url: r.web }) };
    }) } : {}),
  };
}

/** A picture handed to the client inside the tool's answer: a link to our files is one it often cannot open */
export interface Picture { data: string; mimeType: string }
/** A tool's answer with pictures beside it (lib/mcp/server.ts sends each as an image block) */
export interface WithPictures { result: unknown; pictures: Picture[] }
export const hasPictures = (out: unknown): out is WithPictures => !!out && typeof out === "object" && "pictures" in out && "result" in out;

const PICTURE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const PICTURE_MAX = 4 * 1024 * 1024;

/** The stored picture at a path, as the board's 720 px copy when there is one; null when it is not ours or not a picture */
async function pictureAt(path: string | null | undefined): Promise<Picture | null> {
  const card = cardCopyOf(path);
  const cardKey = card ? keyOf(card) : null;
  const key = cardKey && (await ensureCardCopy(cardKey).catch((err) => { log.warn("mcp.card_copy_failed", { ref: cardKey, err }); return false; })) ? cardKey : keyOf(path ?? "");
  const f = key ? await getFile(key) : null;
  return f && PICTURE_TYPES.has(f.contentType) && f.size <= PICTURE_MAX ? { data: f.body.toString("base64"), mimeType: f.contentType } : null;
}

/** One reference, whole: what it is, what the AI read in it, what the team said on it, a text's words, and its picture */
export async function readReference(ctx: McpCtx, id: string): Promise<WithPictures> {
  const [row] = await db.select(ITEM_COLUMNS).from(T).where(and(eq(T.id, String(id ?? "").trim()), inArray(T.organizationId, ctx.workspaces.map((w) => w.id)))).limit(1);
  if (!row) throw new HttpError(404, `No reference with id "${id}". list_references gives the ids of a project's references.`);
  const item = rowToItem(row);
  const kind = mediaKindOf(row.web);
  const [comments, filed, text, shots] = await Promise.all([
    listItemComments(row.organizationId, row.id),
    db.select({ id: P.id, name: P.name }).from(PI).innerJoin(P, eq(P.id, PI.projectId)).where(and(eq(PI.organizationId, row.organizationId), eq(PI.itemId, row.id))),
    kind === "text" ? readText(row.web) : Promise.resolve(null),
    kind === "web" && !row.thumbnailUrl ? pageShotsFor([row.web]) : Promise.resolve(null),
  ]);
  // The picture the board shows for it: the one the team chose, the image itself, or the top of the page captured
  const picture = await pictureAt(row.thumbnailUrl ?? (kind === "image" ? row.web : shots?.[row.web]?.topUrl))
    .catch((err) => { log.warn("mcp.picture_failed", { ref: row.id, err }); return null; });
  const info = refInfoOf(item, tagsOfRow(row) ?? undefined, comments, dictOf(ctx.user.language));
  const result = {
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
  return { result, pictures: picture ? [picture] : [] };
}

// ─── Writing ─────────────────────────────────────────────────────────────────

const IMAGE_FILE = /\.(png|jpe?g|webp|gif|avif)$/i;
const oneLine = (s: string | undefined, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

export interface NewPiece {
  project: string;
  /** A site, a video, a post, or a picture's own address: one of this or `text` */
  url?: string;
  /** Words kept whole (Markdown): one of this, `url` or `image` */
  text?: string;
  /** A picture's bytes as base64 (a capture pasted in the conversation, a file on disk): one of this, `url` or `text` */
  image?: string;
  title?: string;
  /** Why it is there, in the person's words: the first thing its card says */
  note?: string;
  /** The areas of the system it brings something to */
  areas?: readonly string[];
  /** Brought by the agent on its own: it waits on the board for the team instead of going straight on it */
  suggested?: boolean;
  role?: RefRole | null;
  origin?: string;
}

/** What a url or a text becomes in the library. A picture's own address is downloaded here */
export async function pieceOf(project: { workspace: Workspace }, input: { url?: string; text?: string; image?: string; title?: string }): Promise<Piece> {
  const org = project.workspace.id;
  if (input.image?.trim()) {
    const { body, type } = imageBytes(input.image);
    await assertRoom(project.workspace, { items: 1 });
    return { kind: "image", url: await putFile(newMediaKey(org, type), body, type, org), name: oneLine(input.title, 80) || "Image" };
  }
  if (input.text?.trim()) {
    const text = cleanText(input.text);
    const title = oneLine(input.title, TEXT_TITLE_MAX) || titleOf(text);
    if (!text || !title) throw new HttpError(400, "The text is empty.");
    return { kind: "text", text, title };
  }
  const web = normalizeWebUrl(input.url ?? "");
  if (!web) throw new HttpError(400, `"${input.url}" is not an address that can be saved.`);
  // A picture's own address: the picture is copied, so the board shows it whatever its site does later
  const isImage = IMAGE_FILE.test(new URL(web).pathname);
  if (isImage) await assertRoom(project.workspace, { items: 1 });
  const image = isImage ? await fetchFile(web, undefined, (t) => MEDIA_TYPES.has(t), MAX_MEDIA_BYTES) : null;
  return image
    ? { kind: "image", url: await putFile(newMediaKey(org, image.type), image.body, image.type, org), name: oneLine(input.title, 80) || nameFromFile(new URL(web).pathname.split("/").pop() ?? "") || "Image", source: web }
    : { kind: "url", web, name: oneLine(input.title, 80) };
}

/** A picture handed over as base64: the type is what the bytes say, never what the agent says */
function imageBytes(data: string): { body: Buffer; type: string } {
  const body = Buffer.from(data.replace(/^data:[^,]*,/, "").replace(/\s+/g, ""), "base64");
  const type = imageTypeOf(body);
  if (!type) throw new HttpError(415, "The image is not a PNG, WebP or JPEG.");
  if (body.length > MAX_MEDIA_BYTES) throw new HttpError(413, "The image is too large.");
  return { body, type };
}

/** A reference an agent brings on its own: it waits on the board for the team (lib/suggestions.ts) */
export async function suggestPiece(ctx: McpCtx, project: { id: string; workspace: Workspace }, input: { url?: string; text?: string; image?: string; title?: string; note?: string; areas?: readonly string[]; role?: RefRole | null; origin?: string; key?: string }): Promise<Brought> {
  const web = input.url?.trim() ? normalizeWebUrl(input.url) : null;
  if (input.url?.trim() && !web) throw new HttpError(400, `"${input.url}" is not an address that can be saved.`);
  const text = input.text?.trim() ? cleanText(input.text) : undefined;
  // The same picture brought twice is one suggestion: its key is its bytes
  const key = web ? `url:${webKeyOf(web)}` : input.image?.trim() ? `image:${createHash("sha256").update(imageBytes(input.image).body).digest("hex").slice(0, 32)}` : textKey(input.key || oneLine(input.title, TEXT_TITLE_MAX) || titleOf(text ?? ""));
  return suggestReference(project.workspace.id, project.id, {
    key, web: web && !IMAGE_FILE.test(new URL(web).pathname) ? web : undefined, text,
    build: () => pieceOf(project, input), note: input.note, role: input.role ?? null, areas: cleanAreas(input.areas), origin: input.origin,
  }, ctx.user, ctx.via);
}

/**
 * Saves a reference on a project's board, signed with the person's name and the app it came from. A site already
 * in the library is not saved twice: it is filed in the project and the rest (areas) still applies.
 */
export async function addPiece(ctx: McpCtx, origin: string, input: NewPiece) {
  const project = await resolveProject(ctx, input.project);
  const org = project.workspace.id;
  const author = authorOf(ctx);
  if ([input.url, input.text, input.image].filter((x) => x?.trim()).length !== 1) throw new HttpError(400, "Pass exactly one of url, text or image.");
  const note = oneLine(input.note, 500);
  const areas = cleanAreas(input.areas);
  if (input.suggested) {
    const brought = await suggestPiece(ctx, project, { ...input, note, areas });
    return {
      setup: await setupStep(org, project.id),
      id: brought.itemId, name: brought.name, brought: brought.status, project: project.name,
      status: brought.status === "dismissed" ? "The team dismissed this one before: it was not brought back." : brought.status === "on_board" ? "It is on the board already." : "It waits on the board for the team's yes or no.",
      url: projectUrl(origin, project.id),
    };
  }
  const piece = await pieceOf(project, input);
  // As when a URL is pasted in the app: a post on X is imported, and the AI tags what was saved, once answered
  const { item, existed } = await addReference(org, piece, ctx.user, {
    note, via: ctx.via, file: { projectId: project.id, areas, onError: "throw", existing: true }, finish: { post: true, tag: "after" },
  });
  const itemId = item.id!;
  // Already in the library, with someone's note on it: why it is here now goes in its thread
  if (existed && note) await addComment(org, { itemId, authorId: author.id, authorName: author.name, body: note });
  return {
    setup: await setupStep(org, project.id),
    id: itemId, name: item.name, project: project.name,
    ...(existed ? { already_in_library: true } : {}),
    ...(areas.length ? { areas } : {}),
    url: projectUrl(origin, project.id),
  };
}

/**
 * Takes references off a project's board: a duplicate, one brought by mistake. Each stays in the workspace's
 * library (and on any other board), so it can be filed again; what was voted on it in this project goes.
 * One still waiting for the team's yes is dismissed, as the ✕ on its card does (lib/suggestions.ts): it leaves the
 * library too when the suggestion made it, and the same thing is not brought back.
 */
export async function removeReferences(ctx: McpCtx, origin: string, input: { project: string; ids: readonly string[] }) {
  const project = await resolveProject(ctx, input.project);
  const org = project.workspace.id;
  const S = schema.projectSuggestion;
  const ids = [...new Set(input.ids.map((i) => String(i).trim()).filter(Boolean))];
  const filed = ids.length ? await db.select({ id: PI.itemId, name: T.name }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, org), eq(PI.projectId, project.id), inArray(PI.itemId, ids))) : [];
  const rest = ids.filter((i) => !filed.some((f) => f.id === i));
  // The rest may be waiting: found by the reference's id, or by the suggestion's own
  const waiting = rest.length ? await db.select({ id: S.id, itemId: S.itemId, name: T.name }).from(S).innerJoin(T, eq(T.id, S.itemId))
    .where(and(eq(S.organizationId, org), eq(S.projectId, project.id), eq(S.kind, "reference"), eq(S.state, "open"))) : [];
  const dropped = waiting.filter((w) => rest.includes(w.itemId!) || rest.includes(w.id));
  const missing = rest.filter((i) => !dropped.some((w) => w.itemId === i || w.id === i));
  await unfileItems(org, project.id, filed.map((f) => f.id), { userId: ctx.user.id });
  if (dropped.length) await dismissSuggestions(org, project.id, { refs: dropped.map((w) => w.id) }, { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email });
  if (filed.length || dropped.length) versionAfterWrite(ctx, origin, project);
  return {
    removed: filed.map((f) => ({ id: f.id, name: f.name })),
    ...(dropped.length ? { dismissed: dropped.map((w) => ({ id: w.itemId, name: w.name })) } : {}),
    project: project.name,
    ...(missing.length ? { not_on_this_board: missing } : {}),
    status: [
      filed.length ? "Off the board; still in the library. The codes R1, R2… of the ones after them move up: call list_references again before citing one." : "",
      dropped.length ? "The ones waiting for the team are dismissed: they will not be brought back as they were." : "",
    ].filter(Boolean).join(" ") || "None of these was on the board or waiting on it.",
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
  const never = (input.never ?? []).map((l) => oneLine(l, 400)).filter(Boolean).join("\n").slice(0, NEVER_MAX);
  const [system, activity] = await Promise.all([getSystem(org, project.id), systemActivity(org, project.id, ctx.user.id)]);
  const current = system.areas.find((a) => a.area === area);
  if (current?.decision.trim() === decision && (!never || never === current.never)) {
    return { proposed: false, reason: "The area already says exactly this.", project: project.name, area, url: projectUrl(origin, project.id) };
  }
  // The same text already waiting is not proposed twice (a client retrying, or asked again in another chat)
  const waiting = (activity.notes[area] ?? []).find((n) => n.proposal?.state === "open" && n.proposal.decision === decision);
  if (waiting) return { proposed: false, reason: "This same text is already waiting for the team's answer.", project: project.name, area, url: projectUrl(origin, project.id) };
  const note = await addAreaComment(org, project.id, area, oneLine(input.reason, 600) || decision, authorOf(ctx), { proposal: { decision, why, never, state: "open", via: ctx.via } });
  versionAfterWrite(ctx, origin, project);
  return {
    proposed: true, id: note.id, project: project.name, area,
    status: "Waiting for the team: someone accepts or rejects it in the app. The area says what it said until then.",
    ...(current?.decision ? { current_decision: current.decision } : {}),
    url: projectUrl(origin, project.id),
  };
}

/** What an agent wrote, kept as a version of the file once the answer is out */
export function versionAfterWrite(ctx: McpCtx, origin: string, project: { id: string; workspace: Workspace }): void {
  inBackground(async () => { await recordVersion({ organizationId: project.workspace.id, projectId: project.id, via: "mcp-write", viaName: ctx.via, byName: ctx.user.name, locale: ctx.user.language, origin }); });
}

/** Each measure opens a browser on the server */
const MEASURES_PER_HOUR = 10;
const CHECKS_PER_HOUR = 20;

export const QUESTION_IDS = PLAYBOOK_QUESTIONS.map((q) => q.id) as [string, ...string[]];

/** The questions a project still has open, as an agent asks them next */
async function stillOpen(org: string, projectId: string, lang: "en" | "es") {
  const [[row], [board]] = await Promise.all([
    db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, org), eq(P.id, projectId))).limit(1),
    db.select({ id: PI.itemId }).from(PI).where(and(eq(PI.organizationId, org), eq(PI.projectId, projectId))).limit(1),
  ]);
  const brief = readBrief(row?.brief);
  return openQuestions(brief, new Set(Object.keys(brief?.answers ?? {}))).map((q) => ({ id: q.id, question: questionText(q, lang, !!board) }));
}

/**
 * The person's answer to one of criterio.md's starting questions, kept in the project's brief under the question's
 * id: the file lists it as answered and no agent asks it again. Straight in, no approval: it is what the person said.
 */
export async function answerQuestion(ctx: McpCtx, origin: string, input: { project: string; question: string; answer: string; source?: AnswerSource; from?: string }) {
  const project = await resolveProject(ctx, input.project);
  const q = questionById(String(input.question ?? ""));
  if (!q) throw new HttpError(400, `"${input.question}" is not a starting question. Their ids are in criterio.md, under the starting questions: ${QUESTION_IDS.join(", ")}.`);
  const text = String(input.answer ?? "").trim().slice(0, BRIEF_LIMITS.answer);
  if (!text) throw new HttpError(400, "The answer is empty.");
  // What the team dismissed from an agent is not brought back by one
  if (input.source === "agent" && (await dismissedKeys(project.workspace.id, project.id)).has(answerKey(q.id, text))) {
    return { saved: false, reason: "The team dismissed this same answer before.", project: project.name, question: q.id, url: projectUrl(origin, project.id) };
  }
  await saveAnswer(project.workspace.id, project.id, q.id, { text, by: ctx.user.name || ctx.user.email, via: ctx.via, source: input.source, from: input.from }, ctx.user.id);
  versionAfterWrite(ctx, origin, project);
  const open = await stillOpen(project.workspace.id, project.id, ctx.user.language === "es" ? "es" : "en");
  return {
    saved: true, project: project.name, question: q.id,
    still_open: open,
    status: open.length ? `${open.length} starting questions still open. Ask the next one, one at a time.` : "Every starting question is answered.",
    url: projectUrl(origin, project.id),
    setup: await setupStep(project.workspace.id, project.id),
  };
}

/**
 * A public site as measured values, on any client: what `skills/bring-brand` does with local Chrome, on the server,
 * for an agent with no machine. Reads, never writes: the agent shows the values and calls bring_brand after the yes.
 */
export async function measureSite(ctx: McpCtx, input: { url: string }) {
  const url = normalizeWebUrl(input.url);
  if (!url) throw new HttpError(400, "That is not a public address.");
  if (!(await allow(`measure:${ctx.user.id}`, MEASURES_PER_HOUR, 3_600_000))) throw new HttpError(429, "Too many sites measured in an hour. Wait and go on.");
  const { tokens, logoSvg, fontFiles } = await extractDesign(url);
  return { url, title: tokens.title, colors: tokens.colors, typography: { ...tokens.typography, paragraphs: undefined }, fonts: tokens.fonts, spacing: tokens.spacing, copy: keptCopy(tokens.copy), pictures: tokens.media.pictures, logo: { svg: logoSvg }, fontFiles };
}

/**
 * Writes the project's criterio.md with the same pass as the app, so the file is the same from every door. The first
 * pass of an account is free, as in the app; later ones count as an AI action.
 */
export async function runPass(ctx: McpCtx, origin: string, input: { project: string }) {
  const project = await resolveProject(ctx, input.project);
  const org = project.workspace.id;
  await assertQuota(project.workspace, "ai");
  const usage = { organizationId: org, userId: ctx.user.id };
  try {
    await runSystem({ organizationId: org, projectId: project.id, usage, language: project.workspace.outputLanguage });
  } catch (e) {
    if (e instanceof HttpError && e.status === 400) return { written: false, project: project.name, status: "There is nothing to write from: no answers, no brand, no references. Ask the person one thing about the project first.", setup: await setupStep(org, project.id) };
    throw e;
  }
  await runBrand({ organizationId: org, projectId: project.id, usage, language: project.workspace.outputLanguage, auto: true }).catch((err) => log.warn("mcp.brand_pass_failed", { ref: project.id, err }));
  versionAfterWrite(ctx, origin, project);
  return { written: true, project: project.name, status: "criterio.md is written. Read it with read_criterio.", url: projectUrl(origin, project.id), setup: await setupStep(org, project.id) };
}

/**
 * Opens the landing on the server and returns what it does for its goal, at desktop and phone width, with the project's
 * rules. The facts are measured here; judging them against the file is the agent's. Only public addresses: for localhost,
 * look at the page yourself. Nothing is stored.
 */
export async function checkLandingPage(ctx: McpCtx, origin: string, input: { project: string; url: string }): Promise<WithPictures> {
  const project = await resolveProject(ctx, input.project);
  const url = normalizeWebUrl(input.url);
  if (!url) throw new HttpError(400, "That is not a public address.");
  if (!(await allow(`check:${ctx.user.id}`, CHECKS_PER_HOUR, 3_600_000))) throw new HttpError(429, "Too many checks in an hour. Wait and go on.");
  if (project.workspace.plan === "free" && !(await allow(`check:month:${project.workspace.id}`, FREE_CHECKS_PER_MONTH, 30 * 24 * 3_600_000))) throw new HttpError(402, `The free plan has ${FREE_CHECKS_PER_MONTH} landing checks a month.`);
  const [check, view, system] = await Promise.all([
    checkLanding(url),
    loadShareView(project.workspace.id, project.id, "full", ctx.user.language, null, origin),
    getSystem(project.workspace.id, project.id),
  ]);
  const failed = check.findings.filter((f) => !f.ok);
  return {
    result: {
    url, project: project.name, outlines: (system.outlines ?? []).map((o) => ({ name: o.name, goal: o.goal, sections: o.sections.map((s) => ({ kind: s.kind, job: s.job })) })),
    findings: check.findings, desktop: check.desktop, phone: check.phone,
    rules: view ? partMd(view.blocks, "guide") : "",
    do: `${failed.length ? `${failed.length} of the landing's rules fail. Fix those first.` : "The landing's own rules pass."} Then look at both pictures and judge the page against the goal and every Never line in rules, naming the rule id or line each breach breaks. Show the person the result.`,
    },
    pictures: [{ data: check.shots.desktop.toString("base64"), mimeType: "image/jpeg" }, { data: check.shots.phone.toString("base64"), mimeType: "image/jpeg" }],
  };
}

/** The path as the agent reads it: where the project stands and what to do next */
export async function setupStep(org: string, projectId: string) {
  const facts = await setupFacts(org, projectId);
  const state = setupState(facts);
  return { next: state.next, do: nextAction(state, facts.refs, facts.suggested), complete: state.complete, ask: state.ask, confirm: state.confirm, steps: state.steps };
}

/** Comments people left on the running page, open ones by default */
export async function listComments(ctx: McpCtx, input: { project: string; all?: boolean }) {
  const project = await resolveProject(ctx, input.project);
  const comments = await pageComments(project.workspace.id, project.id, !!input.all);
  return { project: project.name, comments: comments.map((c) => ({ id: c.id, who: c.who, said: c.body, at: c.at, ...c.page })), do: comments.length ? "Find each element by its selector, or by its text and section if the build changed. Fix it, then call resolve_comment with what changed." : "No open comments." };
}

export async function resolveComment(ctx: McpCtx, input: { project: string; id: string; change: string }) {
  const project = await resolveProject(ctx, input.project);
  const c = await resolvePageComment(project.workspace.id, input.id, input.change);
  return { resolved: true, id: c.id, project: project.name, do: "If this taught something for the next landing, keep it with record_learning." };
}

/** The person sees what the agent writes, not this answer, so the agent has to print him */
const TINO_GREETING = { print_first: "If you have not printed this in this conversation, make it the first thing in your next message: exactly as it is, in a code block, with nothing else in the block. Only once.", drawing: TINO, voice: TINO_VOICE };

/** What is pending on a project, so each session starts from it: decisions to take, and answers that arrived */
async function waiting(org: string, projectId: string) {
  const [activity, facts] = await Promise.all([systemActivity(org, projectId), setupFacts(org, projectId)]);
  const proposals = Object.values(activity.notes).flat().filter((n) => (n as { proposal?: { state?: string } }).proposal?.state === "open").length;
  const fromClient = Object.entries(facts.brief?.answers ?? {}).filter(([, a]) => a.source === "client").map(([id]) => id);
  const outlines = (await getSystem(org, projectId)).outlines ?? [];
  const brought = { references: facts.suggested ?? 0, answers: Object.values(facts.brief?.answers ?? {}).filter((a) => a.source === "agent").length, drafts: outlines.filter((o) => o.draft).length };
  return { proposals_to_decide: proposals, client_answers: fromClient, ...(brought.references || brought.answers || brought.drafts ? { brought_by_an_agent: { ...brought, note: "Context an agent brought, waiting for the team's yes or no in the app. Do not ask again what it answers: show it once as one list to confirm." } } : {}), open_questions: setupState(facts).ask, open_comments: (await pageComments(org, projectId)).length, note: "Tell the person what is pending, in a line, before anything else." };
}

/** Where a project stands along the setup, and what the agent does next. With `skip`, the person declined that step */
export async function startSetup(ctx: McpCtx, origin: string, input: { project?: string; skip?: string; ask_client?: boolean }) {
  if (!input.project) {
    const known = await listProjects(ctx, origin);
    return { next: "project", do: "If this repo's AGENTS.md or CLAUDE.md has a line \"criterio project: <name>\", that is the project. Otherwise pick the person's project from `projects`, or create_project. Then call start_setup again with it.", projects: known, tino: TINO_GREETING };
  }
  const project = await resolveProject(ctx, input.project);
  if (input.skip) await skipSetupStep(project.workspace.id, project.id, input.skip, ctx.user.id);
  return {
    tino: TINO_GREETING,
    project: project.name, url: projectUrl(origin, project.id), ...(await setupStep(project.workspace.id, project.id)),
    ...(input.ask_client ? { client_link: `${origin}/a/${await clientAskToken(project.workspace.id, project.id, ctx.user.id)}` } : {}),
    waiting: await waiting(project.workspace.id, project.id),
    repo_line: { line: `criterio project: ${project.name} (${project.id})`, do: "In a repo that does not have this line, ask once, and after a yes add it to AGENTS.md or CLAUDE.md, so a later session here finds the project. The id keeps finding it after a rename; if the line names it otherwise, fix the line. Another repo can copy the line to share this criterio." },
  };
}

/**
 * Something learned with the person (a correction, a choice, a preference), kept with the project's system: the
 * next session reads it under "What was learned". Straight in: it changes no decision, which only propose_decision does.
 */
export async function recordLearning(ctx: McpCtx, origin: string, input: { project: string; note: string; area?: string; section?: string; pick?: boolean; rejected?: boolean }) {
  const project = await resolveProject(ctx, input.project);
  const note = oneLine(input.note, LEARNING_NOTE_MAX);
  if (!note) throw new HttpError(400, "The note is empty.");
  if (input.area && !(SYSTEM_AREAS as readonly string[]).includes(input.area)) throw new HttpError(400, `"${input.area}" is not an area. The areas are: ${SYSTEM_AREAS.join(", ")}.`);
  const entry = await addLearning(project.workspace.id, project.id, { note, area: input.area as SystemArea | undefined, section: input.section, pick: input.pick, rejected: input.rejected, by: ctx.user.name || ctx.user.email, via: ctx.via });
  versionAfterWrite(ctx, origin, project);
  return {
    saved: true, id: entry.id, project: project.name, ...(entry.area ? { area: entry.area } : {}),
    status: "Kept under \"What was learned\" in criterio.md. To change what an area decides, use propose_decision.",
    url: projectUrl(origin, project.id),
    setup: await setupStep(project.workspace.id, project.id),
  };
}

/** A landing's plan by name: whole, or changed section by section. A plan and not a decision, so it goes straight in */
export async function setOutline(ctx: McpCtx, origin: string, input: { project: string; name: string; goal?: string; sections?: LandingSection[]; changes?: OutlineChange[]; built?: { url?: string } }) {
  const project = await resolveProject(ctx, input.project);
  const known = ((await getSystem(project.workspace.id, project.id)).outlines ?? []).find((o) => o.name.toLowerCase() === input.name.trim().toLowerCase());
  if (input.sections && input.changes?.length) throw new HttpError(400, "Pass sections (the whole plan) or changes (to the saved one), not both.");
  if (!input.sections && !known) throw new HttpError(404, `There is no plan "${input.name}" yet: pass its goal and all its sections.`);
  const goal = input.goal?.trim() || known?.goal;
  if (!goal) throw new HttpError(400, "The plan needs its goal.");
  const sections = input.sections ?? changedSections(known!.sections, input.changes ?? []);
  if (!sections.length) throw new HttpError(400, "A plan needs at least one section.");
  const outline = await saveOutline(project.workspace.id, project.id, { name: known?.name ?? input.name, goal, sections, built: input.built ? { via: ctx.via, ...input.built } : undefined });
  versionAfterWrite(ctx, origin, project);
  return { saved: true, project: project.name, outline: outline.name, sections: outline.sections.length, url: projectUrl(origin, project.id), setup: await setupStep(project.workspace.id, project.id) };
}
