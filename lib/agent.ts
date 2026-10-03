// Every action of the app, asked for in words. The person types what they want ("put this reference under
// motion", "make the voice drier", "organise the inbox", "bring my saved posts from X") and the agent turns
// it into actions from one catalogue, the same functions the buttons call, and runs them. What costs
// nothing to undo runs at once; deleting waits for a confirmation. What the app cannot do on its own
// (importing from a browser) comes back as a guide: how to do it and where.
import "server-only";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError } from "./workspace-core";
import type { Ctx } from "./workspace-core";
import { getErrors } from "./i18n";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { llm, LlmError } from "./llm";
import { recordUsage, type UsageCtx } from "./usage";
import { addItem, deleteItem, rowToItem, setItemNote, editUserTags } from "./items";
import { nameFor } from "./item-name";
import { hostOf, mediaKindOf, normalizeWebUrl, typeFromUrl } from "./url";
import { loadProjects, createProject, renameProject, deleteProject, fileItems, unfileItems } from "./projects";
import { saveBrief } from "./polish";
import { addComment } from "./comments";
import { startTagJob } from "./tag-jobs";
import { taggerEnabled } from "./tagger";
import { SYSTEM_MODEL, loadSystems, decideArea, releaseArea, revertArea, assignEvidence, dropEvidence, runSystem, curateArea, triageInbox, applyTriage, setAreaNever, getSystem } from "./system";
import { SYSTEM_AREAS, type ProjectSystem, type SystemArea } from "@/types/system";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";

const P = schema.project;
const T = schema.inspoItem;

/** References the planner reads: the current board first, then the rest of the library, cut here */
const MAX_REFS = 320;

// ─── The catalogue ───────────────────────────────────────────────────────────
// Ids are the short codes the planner was given (p1, r12); the executor resolves them.

const Area = z.enum(SYSTEM_AREAS);
const Topic = z.enum(["import_x", "import_bookmarks", "extension", "export_md", "other"]);

const ActionSchema = z.discriminatedUnion("kind", [
  // Not a command: a search of the library, run by the interface
  z.object({ kind: z.literal("search"), text: z.string() }),
  // Go somewhere: a project (or "inbox", "library", "home"), a view, an area
  z.object({ kind: z.literal("go"), project: z.string().nullable(), view: z.enum(["system", "board"]).nullable(), area: Area.nullable() }),
  z.object({ kind: z.literal("file"), items: z.array(z.string()), project: z.string(), on: z.boolean() }),
  z.object({ kind: z.literal("assign"), items: z.array(z.string()), project: z.string(), area: Area, on: z.boolean() }),
  // Writes the area as the team's: the person dictated it, runs leave it alone
  z.object({ kind: z.literal("decide"), project: z.string(), area: Area, decision: z.string(), why: z.string() }),
  // What an area must never do: a rule added, or one taken out (matched by its words)
  z.object({ kind: z.literal("never"), project: z.string(), area: Area, add: z.string().nullable(), remove: z.string().nullable() }),
  z.object({ kind: z.literal("release"), project: z.string(), area: Area }),
  z.object({ kind: z.literal("clear"), project: z.string(), area: Area }),
  z.object({ kind: z.literal("undo"), project: z.string(), area: Area }),
  z.object({ kind: z.literal("read_board"), project: z.string() }),
  z.object({ kind: z.literal("curate"), project: z.string(), area: Area }),
  // The inbox (or the given references) filed into projects and hung from areas by the agent
  z.object({ kind: z.literal("organize"), items: z.array(z.string()).nullable() }),
  z.object({ kind: z.literal("create_project"), name: z.string(), about: z.string().nullable() }),
  z.object({ kind: z.literal("rename_project"), project: z.string(), name: z.string() }),
  z.object({ kind: z.literal("delete_project"), project: z.string() }),
  z.object({ kind: z.literal("brief"), project: z.string(), about: z.string() }),
  z.object({ kind: z.literal("add_url"), url: z.string(), project: z.string().nullable() }),
  z.object({ kind: z.literal("note"), item: z.string(), text: z.string() }),
  z.object({ kind: z.literal("comment"), item: z.string(), text: z.string() }),
  z.object({ kind: z.literal("tag"), item: z.string(), add: z.string().nullable(), remove: z.string().nullable() }),
  z.object({ kind: z.literal("delete_items"), items: z.array(z.string()) }),
  // What the app cannot do by itself: say how, and where the button is
  z.object({ kind: z.literal("guide"), topic: Topic, text: z.string() }),
]);
export type AgentAction = z.infer<typeof ActionSchema>;

const PlanSchema = z.object({
  say: z.string(),
  actions: z.array(ActionSchema),
});

/** Actions that destroy something: planned, shown, run only when the person says so */
const DANGEROUS = new Set<AgentAction["kind"]>(["delete_items", "delete_project", "clear"]);
/** Actions the interface runs itself (nothing changes on the server) */
const CLIENT_SIDE = new Set<AgentAction["kind"]>(["search", "go", "guide"]);

// ─── Where the person is ─────────────────────────────────────────────────────

export interface AgentScope {
  /** The project open, if any */
  projectId?: string | null;
  /** "inbox" | "library" | "home" | a project id */
  space?: string | null;
  view?: "system" | "board" | null;
  /** The area open in the system, if any */
  area?: string | null;
  /** The reference open in the panel, if any */
  openItemId?: string | null;
  /** The card or orbit reference the pointer was on last, a few seconds before the request */
  hoverItemId?: string | null;
  /** References ticked on the system's ring (picking for an area) */
  pickedIds?: string[] | null;
  /** References the last request touched, so "and put it in color too" follows */
  recentIds?: string[] | null;
  /** What is on screen right now (after filters), so "these" means something */
  visibleIds?: string[] | null;
  /** The last exchanges of this conversation, oldest first */
  history?: AgentTurn[] | null;
}

/** One earlier exchange, as the interface keeps it */
export interface AgentTurn { text: string; say: string; did: string[] }

/** One line of what happened, for the interface to say in the reader's language */
export interface AgentDone {
  kind: AgentAction["kind"];
  ok: boolean;
  error?: string;
  /** How many references it touched */
  n?: number;
  /** The project's name, the area, the item's name: whatever the line needs */
  project?: string;
  area?: SystemArea;
  name?: string;
  text?: string;
  /** The references it touched, so the next request can say "it" */
  items?: string[];
  /** The actions that take this one back, when it has them (filing, hanging, organising) */
  undo?: AgentAction[];
  /** For file and assign: in (true) or out (false) */
  on?: boolean;
  topic?: z.infer<typeof Topic>;
  /** For the interface's own actions */
  go?: { space: string | null; view: "system" | "board" | null; area: SystemArea | null };
}

/** What changed, so the interface catches up without reloading */
export interface AgentPatch {
  projects?: Project[];
  links?: ProjectLinks;
  systems?: Record<string, ProjectSystem>;
  added?: InspoItem[];
  removed?: string[];
}

export interface AgentReply {
  say: string;
  done: AgentDone[];
  /** Resolved actions waiting for a yes (ids are real ids here) */
  pending: AgentAction[];
  patch: AgentPatch;
  costUsd: number | null;
}

// ─── The planner ─────────────────────────────────────────────────────────────

/** Flip when the extension's import (PR #54) is in production: the guide then says it imports bookmarks */
const IMPORT_READY = false;
const IMPORT_NOTE = IMPORT_READY
  ? "The browser extension saves the page you are on and imports your X bookmarks and Chrome bookmarks in one go; the button under this message opens it."
  : "Today the browser extension saves the page you are on (the button under this message opens it); importing X bookmarks and Chrome bookmarks in one go is being built and is not available yet. Say that plainly, and that meanwhile they can paste URLs here and you add them.";

const PLAN_SYSTEM = `You are the agent inside a design team's tool. The team keeps a library of references (websites, images, posts, videos), files them into PROJECTS, and each project has a SYSTEM of eight areas (typography, color, layout, motion, iconography, logo, imagery, voice), each with a decision and the criterio behind it. A person just typed a request. Turn it into actions from the catalogue, or answer. You CAN do everything in the catalogue; never say you cannot do something that is in it.

The catalogue (kind: what it does):
- search: a search of the library by words. go: open a project (or "inbox", "library", "home"), a view ("system" or "board"), an area.
- file: put references in a project (on true) or take them out (on false). assign: hang references from an area of a project's system (on true) or take them off it (on false).
- decide: write an area's decision and its why, as the team's. never: what an area must NEVER do. "add" carries the rule itself, written out in 3 to 12 words in the person's language (e.g. add: "rebotes y curvas elásticas", remove: null); "remove" carries the words of a rule to take out (add: null). Never leave both empty: one action per rule. Use it for "never…", "no more…", "we threw away…", "don't use…", and leave the decision alone. release: hand an area back to the board (the model may change it again). clear: empty an area. undo: one step back in an area (its previous text).
- read_board: the model reads the whole board and proposes every area it can. curate: the model sets the table of one area (candidates kept and discarded, with reasons) and drafts its decision.
- organize: the model files the unfiled references (the inbox, or the given ones) into projects and areas.
- create_project (name, about), rename_project, delete_project, brief (the project's about, one paragraph).
- add_url: save a web by its URL (and file it in a project). note: rewrite a reference's note. comment: leave a comment on a reference. tag: add or remove a tag (free word, lowercase).
- delete_items: delete references.
- guide: how to do what the app cannot do from here (importing from a browser, the extension).
Several actions in one request are fine, in order.

How to read the request:
- A prohibition ("never…", "no…", "nada de…", "sin…", "fuera…") about an area is a "never" action. Do not also rewrite the decision with "decide": the decision stays exactly as it is.
- "this", "these", "esta", "estas", "it", "la": in this order, the reference marked "open" (in the panel), then "under_pointer" (the card the pointer was on last, seconds before they sent the request), then the ones marked "picked" (ticked on the ring), then "recent" (what the previous request touched), then what is "on_screen" when the request clearly means all of them. If none of these fits and the request needs one reference, do not guess: say what you need in "say" and return no actions.
- The earlier exchanges of this conversation come with the request: a short follow-up ("and in color too", "undo that", "the other one") continues them.
- A project named loosely ("la landing", "savvia") is the closest project by name. No project named and one is open: that one.
- Putting a reference under an area ("add this to motion") is "assign": it files the reference in the project too.
- "Undo", "deshaz", "vuelve atrás" on an area is "undo". "Take X off motion", "quita X de motion" is "assign" with on false.
- Changing a decision in words ("make the voice drier", "the palette should be warmer", "corrige el tono") is "decide": write the area's new decision yourself (1 to 3 sentences, max 60 words, concrete values when known), starting from the area as it stands and applying what the person asked, with a "why" of one or two sentences (max 40 words). Keep everything the person did not ask to change.
- "Read the board", "update the system", "qué dice el tablón" is "read_board". "Help me decide X", "curate X", "pon la mesa de X" is "curate". "Organise the inbox", "file what is unfiled" is "organize" (items null = the whole inbox).
- Looking for references ("show me dark ones", "busca webs con serif", a few descriptive words with no verb) is "search" with the words to search; never guess ids for a search.
- Deleting is allowed but is confirmed by the person afterwards: still return it as an action.
- Importing from a browser, from X/Twitter bookmarks, Chrome bookmarks, or installing the extension: the app cannot do it from here. Return "guide" with the topic and a short text saying how. ${IMPORT_NOTE}
- A question about the project or the system (what did we decide about color, what is missing): answer in "say" from the data given, with no actions.
- Ids are short codes (p1, r12): use them exactly as given, never invent one. An unknown area name means no action and a "say" asking which.

"say": one or two sentences to the person, in their language, plain and direct: what you did or will do, or the answer. No markdown, no dashes as punctuation. Never list ids, and never name the catalogue's kinds (say "I add them", not "add_url").`;

const LANGUAGE: Record<Locale, string> = {
  en: "The person writes in English or Spanish; answer in English.",
  es: "Answer in Castilian Spanish (Spain), natural and direct, tú form.",
};

interface Codes { items: Map<string, string>; projects: Map<string, string> }

async function context(ctx: Ctx, scope: AgentScope) {
  const org = ctx.workspace.id;
  const [{ projects, links }, systems, rows] = await Promise.all([
    loadProjects(org),
    loadSystems(org),
    db.select({ row: T }).from(T).where(eq(T.organizationId, org)).orderBy(desc(T.createdAt)),
  ]);
  const briefs = new Map((await db.select({ id: P.id, polish: P.polish }).from(P).where(eq(P.organizationId, org))).map((r) => [r.id, r.polish?.brief ?? null]));
  const current = scope.projectId && projects.some((p) => p.id === scope.projectId) ? scope.projectId : null;
  // The current board first, then the open and visible ones, then the rest, newest first
  const visible = new Set(scope.visibleIds ?? []);
  const picked = new Set(scope.pickedIds ?? []), recent = new Set(scope.recentIds ?? []);
  const rank = (id: string) => (id === scope.openItemId || id === scope.hoverItemId ? 0 : picked.has(id) || recent.has(id) ? 1 : current && links[id]?.includes(current) ? 2 : visible.has(id) ? 3 : 4);
  const ordered = rows.map((r) => r.row).sort((a, b) => rank(a.id) - rank(b.id)).slice(0, MAX_REFS);
  const codes: Codes = { items: new Map(), projects: new Map() };
  const pcode = new Map<string, string>();
  projects.forEach((p, i) => { codes.projects.set(`p${i + 1}`, p.id); pcode.set(p.id, `p${i + 1}`); });
  const refs = ordered.map((row, i) => {
    const code = `r${i + 1}`;
    codes.items.set(code, row.id);
    const item = rowToItem(row);
    return {
      id: code, name: item.name, host: hostOf(row.web), kind: mediaKindOf(row.web),
      note: [item.note, item.subNote].filter(Boolean).join(" ").slice(0, 140) || undefined,
      in: (links[row.id] ?? []).map((p) => pcode.get(p)).filter(Boolean),
      open: row.id === scope.openItemId || undefined,
      under_pointer: row.id === scope.hoverItemId || undefined,
      picked: picked.has(row.id) || undefined,
      recent: recent.has(row.id) || undefined,
      on_screen: visible.has(row.id) || undefined,
    };
  });
  const projectsText = projects.map((p) => {
    const sys = systems[p.id];
    const full = p.id === current;
    return {
      id: pcode.get(p.id), name: p.name, brief: briefs.get(p.id)?.about || undefined,
      refs: Object.values(links).filter((l) => l.includes(p.id)).length,
      system: sys ? Object.fromEntries(sys.areas.filter((a) => a.decision || full).map((a) => [a.area, full ? { decision: a.decision || null, why: a.why || null, source: a.source, refs: a.evidence.length } : "decided"])) : undefined,
      summary: full ? sys?.summary || undefined : undefined,
    };
  });
  const where = {
    space: scope.space === "inbox" || scope.space === "library" || scope.space === "home" ? scope.space : current ? pcode.get(current) : "library",
    project: current ? pcode.get(current) : null,
    view: scope.view ?? null,
    open_area: scope.area && (SYSTEM_AREAS as readonly string[]).includes(scope.area) ? scope.area : null,
    open_reference: scope.openItemId && codes.items.size ? [...codes.items].find(([, id]) => id === scope.openItemId)?.[0] ?? null : null,
    under_pointer: !!scope.hoverItemId, picked: picked.size, recent: recent.size,
    on_screen: visible.size,
  };
  return { codes, projects, links, systems, where, projectsText, refs };
}

// ─── Resolve and run ─────────────────────────────────────────────────────────

const resolveIn = (codes: Codes, action: AgentAction): AgentAction | null => {
  const item = (c: string) => codes.items.get(c) ?? (isRealItemId(codes, c) ? c : null);
  const items = (cs: string[]) => cs.map(item).filter((x): x is string => !!x);
  const project = (c: string) => codes.projects.get(c) ?? ([...codes.projects.values()].includes(c) ? c : null);
  switch (action.kind) {
    case "search": case "guide": case "create_project": return action;
    case "go": {
      const p = action.project && !["inbox", "library", "home"].includes(action.project) ? project(action.project) : action.project;
      return { ...action, project: p ?? null };
    }
    case "organize": return { ...action, items: action.items ? items(action.items) : null };
    case "add_url": return { ...action, project: action.project ? project(action.project) : null };
    case "file": case "assign": { const p = project(action.project); const its = items(action.items); return p && its.length ? { ...action, project: p, items: its } : null; }
    case "delete_items": { const its = items(action.items); return its.length ? { ...action, items: its } : null; }
    case "note": case "comment": case "tag": { const i = item(action.item); return i ? { ...action, item: i } : null; }
    default: { const p = project(action.project); return p ? { ...action, project: p } : null; }
  }
};
const isRealItemId = (codes: Codes, c: string) => [...codes.items.values()].includes(c);

export async function runActions(ctx: Ctx, actions: AgentAction[], usage: UsageCtx, locale: Locale): Promise<{ done: AgentDone[]; patch: AgentPatch }> {
  const org = ctx.workspace.id;
  const author = { id: ctx.user.id, name: ctx.user.name || ctx.user.email };
  const done: AgentDone[] = [];
  const patch: AgentPatch = {};
  let systemsTouched = false, projectsTouched = false;
  // "Create X and open it": the new project has no code yet, so a "go" with no project means it
  let created: string | null = null;
  const names = new Map((await db.select({ id: P.id, name: P.name }).from(P).where(eq(P.organizationId, org))).map((r) => [r.id, r.name]));
  const itemName = async (id: string) => (await db.select({ name: T.name }).from(T).where(and(eq(T.organizationId, org), eq(T.id, id))).limit(1))[0]?.name;
  for (const a of actions) {
    const line: AgentDone = { kind: a.kind, ok: true };
    try {
      switch (a.kind) {
        case "search": line.text = a.text; break;
        case "guide": line.topic = a.topic; line.text = a.text; break;
        case "go": {
          const space = a.project ?? created;
          line.go = { space, view: a.view, area: a.area }; if (space && names.has(space)) line.project = names.get(space); break;
        }
        case "file":
          if (a.on) await fileItems(org, a.project, a.items, author.id);
          else { await unfileItems(org, a.project, a.items); await dropEvidence(org, a.project, a.items); }
          line.n = a.items.length; line.items = a.items; line.project = names.get(a.project); line.on = a.on; projectsTouched = true; systemsTouched = true;
          if (a.on) line.undo = [{ kind: "file", items: a.items, project: a.project, on: false }];
          break;
        case "assign":
          if (a.on) await fileItems(org, a.project, a.items, author.id);
          for (const id of a.items) await assignEvidence(org, a.project, a.area, id, a.on, author);
          line.n = a.items.length; line.items = a.items; line.project = names.get(a.project); line.area = a.area; line.on = a.on; projectsTouched = true; systemsTouched = true;
          line.undo = [{ kind: "assign", items: a.items, project: a.project, area: a.area, on: !a.on }];
          break;
        case "decide":
          await decideArea(org, a.project, a.area, { decision: a.decision, why: a.why }, author);
          line.project = names.get(a.project); line.area = a.area; line.text = a.decision; systemsTouched = true; break;
        case "never": {
          const cur = (await getSystem(org, a.project)).areas.find((x) => x.area === a.area)?.never ?? "";
          let lines = cur.split("\n").filter(Boolean);
          if (a.remove) { const r = a.remove.toLowerCase(); lines = lines.filter((l) => !l.toLowerCase().includes(r) && !r.includes(l.toLowerCase())); }
          if (a.add?.trim() && !lines.some((l) => l.toLowerCase() === a.add!.trim().toLowerCase())) lines.push(a.add.trim());
          await setAreaNever(org, a.project, a.area, lines.join("\n"));
          line.project = names.get(a.project); line.area = a.area; line.text = a.add ?? a.remove ?? ""; line.on = !!a.add; systemsTouched = true; break;
        }
        case "clear":
          await decideArea(org, a.project, a.area, { decision: "" }, author);
          line.project = names.get(a.project); line.area = a.area; systemsTouched = true; break;
        case "release": await releaseArea(org, a.project, a.area, author); line.project = names.get(a.project); line.area = a.area; systemsTouched = true; break;
        case "undo": await revertArea(org, a.project, a.area, author); line.project = names.get(a.project); line.area = a.area; systemsTouched = true; break;
        case "read_board": await runSystem({ organizationId: org, projectId: a.project, usage, locale }); line.project = names.get(a.project); systemsTouched = true; break;
        case "curate": await curateArea({ organizationId: org, projectId: a.project, area: a.area, usage, locale }); line.project = names.get(a.project); line.area = a.area; systemsTouched = true; break;
        case "organize": {
          const proposals = await triageInbox({ organizationId: org, itemIds: a.items ?? undefined, usage, locale });
          const picks = proposals.filter((p): p is typeof p & { projectId: string } => !!p.projectId);
          const r = await applyTriage(org, picks, author);
          line.n = r.filed; line.items = picks.map((p) => p.itemId); projectsTouched = true; systemsTouched = true;
          // Taking it back: each project gives its references back to the inbox (and its areas drop them)
          const byProject = new Map<string, string[]>();
          for (const p of picks) byProject.set(p.projectId, [...(byProject.get(p.projectId) ?? []), p.itemId]);
          line.undo = [...byProject].map(([project, items]) => ({ kind: "file", items, project, on: false }));
          line.text = [...byProject].map(([project, items]) => `${names.get(project) ?? project}: ${items.length}`).join(" · ");
          break;
        }
        case "create_project": {
          const p = await createProject(org, a.name.trim().slice(0, 60), author.id);
          if (a.about?.trim()) await saveBrief(org, p.id, { about: a.about.trim() }, author.id);
          names.set(p.id, p.name); created = p.id; line.project = p.name; projectsTouched = true; break;
        }
        case "rename_project": { const p = await renameProject(org, a.project, a.name.trim().slice(0, 60)); line.project = p.name; line.text = names.get(a.project); projectsTouched = true; break; }
        case "delete_project": line.project = names.get(a.project); await deleteProject(org, a.project); projectsTouched = true; systemsTouched = true; break;
        case "brief": await saveBrief(org, a.project, { about: a.about.trim() }, author.id); line.project = names.get(a.project); line.text = a.about; break;
        case "add_url": {
          const web = normalizeWebUrl(a.url);
          if (!web) throw new HttpError(400, (await getErrors()).badUrl);
          const item = await addItem(org, { name: await nameFor(web), web, type: typeFromUrl(web), author: author.name, createdBy: author.id });
          if (a.project && item.id) { await fileItems(org, a.project, [item.id], author.id); line.project = names.get(a.project); projectsTouched = true; systemsTouched = true; }
          if (item.id && taggerEnabled()) void startTagJob(org, item.id, author.id).catch(() => null);
          (patch.added ??= []).push(item); line.name = item.name; if (item.id) line.items = [item.id]; break;
        }
        case "note": {
          const r = await setItemNote(org, a.item, "note", a.text, ctx.user, true);
          if (!r) throw new HttpError(404, (await getErrors()).cardGone);
          line.name = r.name; line.text = a.text; line.items = [a.item]; break;
        }
        case "comment": await addComment(org, { itemId: a.item, authorId: author.id, authorName: author.name.split("@")[0], body: a.text }); line.name = await itemName(a.item); line.text = a.text; line.items = [a.item]; break;
        case "tag": {
          const r = await editUserTags(org, a.item, { add: a.add ?? undefined, remove: a.remove ?? undefined });
          if (!r) throw new HttpError(404, (await getErrors()).cardGone);
          line.name = await itemName(a.item); line.text = a.add ?? a.remove ?? ""; line.items = [a.item]; break;
        }
        case "delete_items":
          for (const id of a.items) await deleteItem(org, id);
          (patch.removed ??= []).push(...a.items); line.n = a.items.length; projectsTouched = true; systemsTouched = true; break;
      }
    } catch (e) {
      line.ok = false; line.error = e instanceof Error ? e.message : String(e);
      console.warn("agent action failed:", a.kind, line.error);
    }
    done.push(line);
  }
  if (projectsTouched) Object.assign(patch, await loadProjects(org));
  if (systemsTouched) patch.systems = await loadSystems(org);
  return { done, patch };
}

/** Plans from the request and runs what is safe. Dangerous actions come back resolved, as `pending`. */
export async function ask(ctx: Ctx, input: { text: string; scope: AgentScope; usage: UsageCtx; locale?: Locale }): Promise<AgentReply> {
  const locale = input.locale ?? DEFAULT_LOCALE;
  const text = input.text.trim().slice(0, 1000);
  const c = await context(ctx, input.scope);
  const history = (Array.isArray(input.scope.history) ? input.scope.history : []).slice(-6)
    .map((h) => ({ request: String(h.text ?? "").slice(0, 300), answer: String(h.say ?? "").slice(0, 300), did: Array.isArray(h.did) ? h.did.slice(0, 8).map(String) : [] }));
  const body = [
    `Where the person is (JSON): ${JSON.stringify(c.where)}`,
    `Areas: ${SYSTEM_AREAS.join(", ")}`,
    `Projects (JSON): ${JSON.stringify(c.projectsText)}`,
    `References (JSON, the open and the current board first): ${JSON.stringify(c.refs)}`,
    history.length ? `Earlier exchanges of this conversation, oldest first (JSON): ${JSON.stringify(history)}` : "",
    `The person's request: ${JSON.stringify(text)}`,
  ].filter(Boolean).join("\n\n");
  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm({ model: SYSTEM_MODEL, system: `${PLAN_SYSTEM}\n\n${LANGUAGE[locale]}`, text: body, schema: PlanSchema, maxTokens: 6000, effort: "low" });
  } catch (err) {
    if (!(err instanceof LlmError) || !err.finishReason) throw err;
    throw new Error(`${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }
  void recordUsage(input.usage, { action: "system", model: res.model, inputTokens: res.usage.input, outputTokens: res.usage.output, cacheReadTokens: res.usage.cacheRead, costUsd: res.costUsd, provider: res.provider, requestId: res.id, ref: `agent ${c.refs.length} refs` });
  const plan = PlanSchema.parse(JSON.parse(res.text));
  const resolved = plan.actions.map((a) => resolveIn(c.codes, a)).filter((a): a is AgentAction => !!a).slice(0, 20);
  const now = resolved.filter((a) => !DANGEROUS.has(a.kind));
  const pending = resolved.filter((a) => DANGEROUS.has(a.kind));
  const { done, patch } = await runActions(ctx, now, input.usage, locale);
  console.log(`agent ${ctx.workspace.id}: "${text.slice(0, 60)}" → ${resolved.map((a) => a.kind).join(",") || "nothing"}, ${res.usage.input}+${res.usage.output} tokens, ${res.costUsd ?? "?"} USD`);
  return { say: plan.say.trim(), done, pending, patch, costUsd: res.costUsd };
}

/** The person said yes to the pending actions: real ids, run as they are. */
export async function confirm(ctx: Ctx, actions: unknown, usage: UsageCtx, locale: Locale): Promise<{ done: AgentDone[]; patch: AgentPatch }> {
  const parsed = z.array(ActionSchema).max(20).parse(actions);
  // Only what belongs to this workspace runs: ids are checked against it
  const org = ctx.workspace.id;
  const itemIds = new Set((await db.select({ id: T.id }).from(T).where(eq(T.organizationId, org))).map((r) => r.id));
  const projectIds = new Set((await db.select({ id: P.id }).from(P).where(eq(P.organizationId, org))).map((r) => r.id));
  const ok = parsed.filter((a) => !CLIENT_SIDE.has(a.kind)).filter((a) => {
    if ("items" in a && Array.isArray(a.items) && a.items.some((i) => !itemIds.has(i))) return false;
    if ("item" in a && !itemIds.has(a.item)) return false;
    if ("project" in a && typeof a.project === "string" && !projectIds.has(a.project)) return false;
    return true;
  });
  return runActions(ctx, ok, usage, locale);
}
