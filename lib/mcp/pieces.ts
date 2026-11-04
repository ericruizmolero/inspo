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
import { loadProjects, createProject } from "../projects";
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
import { normalizeWebUrl, mediaKindOf, nameFromFile } from "../url";
import { fetchFile } from "../remote-file";
import { MEDIA_TYPES, MAX_MEDIA_BYTES, newMediaKey } from "../media";
import { putFile, getFile, keyOf, ensureCardCopy } from "../storage";
import { cardCopyOf } from "../board";
import { pageShotsFor } from "../page-shots";
import { assertRoom } from "../quota";
import { cleanText, readText, TEXT_TITLE_MAX } from "../text-refs";
import { addAreaComment, systemActivity } from "../area-comments";
import { saveAnswer, saveBrief, skipSetupStep } from "../brief";
import { nextAction, setupState } from "../setup-core";
import { allow } from "../rate-limit";
import { assertQuota } from "../quota";
import { extractDesign } from "../design-extract";
import { getDesignMd } from "../design-store";
import { keptCopy } from "../ref-measured";
import { runSystem } from "../system/run";
import { runBrand } from "../brand";
import { log } from "../log";
import { setupFacts } from "../setup";
import type { AnswerSource } from "@/types/brief";
import { addLearning } from "../system/areas";
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
export const projectUrl = (origin: string, projectId: string) => `${origin}/?in=${projectId}&view=system`;
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
  return section === "all" ? view.markdown : partMd(view.blocks, section);
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
  const areas = cleanAreas(input.areas);
  let piece: Piece;

  if (hasText) {
    const text = cleanText(input.text);
    const title = oneLine(input.title, TEXT_TITLE_MAX) || titleOf(text);
    if (!text || !title) throw new HttpError(400, "The text is empty.");
    piece = { kind: "text", text, title };
  } else {
    const web = normalizeWebUrl(input.url!);
    if (!web) throw new HttpError(400, `"${input.url}" is not an address that can be saved.`);
    // A picture's own address: the picture is copied, so the board shows it whatever its site does later
    const isImage = IMAGE_FILE.test(new URL(web).pathname);
    if (isImage) await assertRoom(project.workspace, { items: 1 });
    const image = isImage ? await fetchFile(web, undefined, (t) => MEDIA_TYPES.has(t), MAX_MEDIA_BYTES) : null;
    piece = image
      ? { kind: "image", url: await putFile(newMediaKey(org, image.type), image.body, image.type, org), name: oneLine(input.title, 80) || nameFromFile(new URL(web).pathname.split("/").pop() ?? "") || "Image", source: web }
      : { kind: "url", web, name: oneLine(input.title, 80) };
  }
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
  const stored = await getDesignMd(url);
  if (stored) return { url, measured: "stored", at: stored.generatedAt, spec: stored.spec, copy: stored.copy, logo: { png: stored.logoUrl, svg: stored.logoSvgUrl }, fonts: stored.fontFiles };
  const { tokens, logoSvg, fontFiles } = await extractDesign(url);
  return { url, measured: "now", title: tokens.title, colors: tokens.colors, typography: { ...tokens.typography, paragraphs: undefined }, fonts: tokens.fonts, spacing: tokens.spacing, copy: keptCopy(tokens.copy), logo: { svg: logoSvg }, fontFiles };
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
    if (e instanceof HttpError && e.status === 400) return { written: false, project: project.name, status: "There is nothing to read yet. Bring in a brand guide or the site, or add one reference, then call run_pass again.", setup: await setupStep(org, project.id) };
    throw e;
  }
  await runBrand({ organizationId: org, projectId: project.id, usage, language: project.workspace.outputLanguage, auto: true }).catch((err) => log.warn("mcp.brand_pass_failed", { ref: project.id, err }));
  versionAfterWrite(ctx, origin, project);
  return { written: true, project: project.name, status: "criterio.md is written. Read it with read_criterio.", url: projectUrl(origin, project.id), setup: await setupStep(org, project.id) };
}

/** The path as the agent reads it: where the project stands and what to do next */
export async function setupStep(org: string, projectId: string) {
  const state = setupState(await setupFacts(org, projectId));
  return { next: state.next, do: nextAction(state), complete: state.complete, ask: state.ask, confirm: state.confirm, steps: state.steps };
}

/** Where a project stands along the setup, and what the agent does next. With `skip`, the person declined that step */
export async function startSetup(ctx: McpCtx, origin: string, input: { project?: string; skip?: string }) {
  if (!input.project) {
    const known = await listProjects(ctx, origin);
    return { next: "project", do: "Pick the person's project from `projects`, or create_project. Then call start_setup again with it.", projects: known };
  }
  const project = await resolveProject(ctx, input.project);
  if (input.skip) await skipSetupStep(project.workspace.id, project.id, input.skip, ctx.user.id);
  return { project: project.name, url: projectUrl(origin, project.id), ...(await setupStep(project.workspace.id, project.id)) };
}

/**
 * Something learned with the person (a correction, a choice, a preference), kept with the project's system: the
 * next session reads it under "What was learned". Straight in: it changes no decision, which only propose_decision does.
 */
export async function recordLearning(ctx: McpCtx, origin: string, input: { project: string; note: string; area?: string }) {
  const project = await resolveProject(ctx, input.project);
  const note = oneLine(input.note, LEARNING_NOTE_MAX);
  if (!note) throw new HttpError(400, "The note is empty.");
  if (input.area && !(SYSTEM_AREAS as readonly string[]).includes(input.area)) throw new HttpError(400, `"${input.area}" is not an area. The areas are: ${SYSTEM_AREAS.join(", ")}.`);
  const entry = await addLearning(project.workspace.id, project.id, { note, area: input.area as SystemArea | undefined, by: ctx.user.name || ctx.user.email, via: ctx.via });
  versionAfterWrite(ctx, origin, project);
  return {
    saved: true, id: entry.id, project: project.name, ...(entry.area ? { area: entry.area } : {}),
    status: "Kept under \"What was learned\" in criterio.md. To change what an area decides, use propose_decision.",
    url: projectUrl(origin, project.id),
  };
}
