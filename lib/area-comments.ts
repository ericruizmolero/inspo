// The team talking about one area of a project's system. Two voices meet in one thread: what people wrote
// about the area itself (system_area_comment), and what they said on the references the area draws from
// (inspo_comment on those items), so the thread shows why the decision is what it is and who is behind it.
import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import { inBackground, notifyReply, notifyProposalResolved } from "./notify";
import { NEVER_MAX, SYSTEM_AREAS, cleanDecision, type ProjectSystem, type SystemArea } from "@/types/system";

const A = schema.systemAreaComment;
const C = schema.inspoComment;
const P = schema.project;
const U = schema.user;

/** A change someone proposes to an area instead of making it: the text it would have, waiting for the team's yes or no */
export interface AreaProposal { decision: string; why: string; never: string; state: "open" | "accepted" | "rejected"; resolvedBy?: string; /** The AI client it was proposed from over MCP ("Claude"), when it was not written in the app */ via?: string }
/** What a line points at: an option tried on the sample (the choice to put back, and how it reads), a reference,
 *  or the change it proposes */
export type AreaAbout = { choice: Record<string, string | number | boolean>; label: string } | { itemId: string } | { proposal: AreaProposal }
  /** A pin: the line of criterio.md the comment was left on, as it read then, how far across it (0 to 1), and the pin it answers */
  | { pin: { quote: string; x: number; to?: string } };

/** The parts of criterio.md a comment can sit on: an area, or one of the parts that are not one */
const PARTS: readonly string[] = [...SYSTEM_AREAS, "head", "project", "summary", "refs"];

export interface AreaNote {
  id: string;
  /** "area": written about the area; "ref": said on one of its references (itemId) */
  kind: "area" | "ref";
  itemId?: string;
  authorId: string | null; authorName: string; authorImage: string | null;
  body: string; createdAt: string;
  about?: AreaAbout;
  /** Written by whoever asks: they can delete it */
  mine: boolean;
}

const BODY_MAX = 2000;
/** Comments on the references that come into the thread: the latest ones */
const REF_NOTES = 12;

/** Only what the sample understands: short scalar values under known keys, and a short label */
const CHOICE_KEYS = ["bg", "ink", "accent", "light", "radius", "easing", "durationMs", "headline", "subline"];
function cleanAbout(v: unknown): AreaAbout | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (o.proposal && typeof o.proposal === "object") {
    const p = o.proposal as Record<string, unknown>;
    const decision = cleanDecision(p.decision);
    if (!decision) return null;
    const state = p.state === "accepted" || p.state === "rejected" ? p.state : "open";
    return { proposal: { decision, why: String(p.why ?? "").trim().slice(0, 400), never: String(p.never ?? "").split("\n").map((l) => l.trim().replace(/^[-*·]\s*/, "")).filter(Boolean).join("\n").slice(0, NEVER_MAX), state, ...(typeof p.resolvedBy === "string" ? { resolvedBy: p.resolvedBy.slice(0, 80) } : {}), ...(typeof p.via === "string" && p.via.trim() ? { via: p.via.trim().slice(0, 40) } : {}) } };
  }
  if (o.pin && typeof o.pin === "object") {
    const quote = String((o.pin as Record<string, unknown>).quote ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
    const pin = o.pin as Record<string, unknown>;
    const x = typeof pin.x === "number" && Number.isFinite(pin.x) ? Math.max(0, Math.min(1, pin.x)) : 0.98;
    return quote ? { pin: { quote, x, ...(typeof pin.to === "string" && pin.to ? { to: pin.to.slice(0, 40) } : {}) } } : null;
  }
  if (typeof o.itemId === "string" && o.itemId) return { itemId: o.itemId.slice(0, 40) };
  if (!o.choice || typeof o.choice !== "object") return null;
  const choice: Record<string, string | number | boolean> = {};
  for (const [k, x] of Object.entries(o.choice as Record<string, unknown>)) {
    if (!CHOICE_KEYS.includes(k)) continue;
    if (typeof x === "string" && x) choice[k] = x.slice(0, 160); else if (typeof x === "number" && Number.isFinite(x) || typeof x === "boolean") choice[k] = x as number | boolean;
  }
  const label = String(o.label ?? "").trim().slice(0, 80);
  return Object.keys(choice).length && label ? { choice, label } : null;
}

async function assertProject(organizationId: string, projectId: string) {
  const [p] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!p) throw new HttpError(404, (await getErrors()).badBody);
}
const assertArea = async (area: string): Promise<SystemArea> => {
  if (!(SYSTEM_AREAS as readonly string[]).includes(area)) throw new HttpError(400, (await getErrors()).badBody);
  return area as SystemArea;
};
const assertPart = async (part: string): Promise<string> => {
  if (!PARTS.includes(part)) throw new HttpError(400, (await getErrors()).badBody);
  return part;
};

/** The thread of an area, oldest first: its own comments and what was said on `itemIds` (its references) */
export async function areaThread(organizationId: string, projectId: string, area: string, itemIds: string[], userId: string): Promise<AreaNote[]> {
  await assertProject(organizationId, projectId);
  const key = await assertArea(area);
  const ids = itemIds.slice(0, 60);
  const [own, onRefs] = await Promise.all([
    db.select({ id: A.id, authorId: A.authorId, authorName: A.authorName, authorImage: U.image, body: A.body, about: A.about, createdAt: A.createdAt })
      .from(A).leftJoin(U, eq(U.id, A.authorId))
      .where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId), eq(A.area, key))).orderBy(asc(A.createdAt)),
    ids.length
      ? db.select({ id: C.id, itemId: C.itemId, authorId: C.authorId, authorName: C.authorName, authorImage: U.image, body: C.body, createdAt: C.createdAt })
        .from(C).leftJoin(U, eq(U.id, C.authorId))
        .where(and(eq(C.organizationId, organizationId), inArray(C.itemId, ids), isNull(C.parentId))).orderBy(asc(C.createdAt))
      : Promise.resolve([]),
  ]);
  const notes: AreaNote[] = [
    ...own.map(({ about, ...r }) => ({ ...r, kind: "area" as const, mine: r.authorId === userId, authorImage: r.authorImage ?? null, createdAt: r.createdAt.toISOString(), ...(cleanAbout(about) ? { about: cleanAbout(about)! } : {}) })),
    ...onRefs.filter((r) => r.body.trim()).slice(-REF_NOTES).map((r) => ({ ...r, kind: "ref" as const, mine: false, authorImage: r.authorImage ?? null, createdAt: r.createdAt.toISOString() })),
  ];
  return notes.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function addAreaComment(organizationId: string, projectId: string, area: string, body: string, author: { id: string; name: string; image?: string | null }, aboutIn?: unknown): Promise<AreaNote> {
  await assertProject(organizationId, projectId);
  const parsed = cleanAbout(aboutIn);
  // A new proposal is always open: only resolving it (below) may mark it accepted or rejected, and by whom
  const about = parsed && "proposal" in parsed ? { proposal: { ...parsed.proposal, state: "open" as const, resolvedBy: undefined } } : parsed;
  // A pin can sit on any part of the file; the rest of the conversation is an area's
  const key = about && "pin" in about ? await assertPart(area) : await assertArea(area);
  const text = String(body ?? "").trim().slice(0, BODY_MAX);
  if (!text) throw new HttpError(400, (await getErrors()).badBody);
  const row = { id: newId(), projectId, organizationId, area: key, authorId: author.id, authorName: author.name, body: text, about, createdAt: new Date() };
  await db.insert(A).values(row);
  // An answer to a pin: whoever left the pin hears of it by email, once this has answered (lib/notify.ts)
  const to = about && "pin" in about ? about.pin.to : undefined;
  if (to) {
    const [pin] = await db.select({ authorId: A.authorId, body: A.body }).from(A).where(and(eq(A.organizationId, organizationId), eq(A.id, to))).limit(1);
    if (pin) inBackground(async () => { await notifyReply(organizationId, { toUserId: pin.authorId, fromUserId: author.id, fromName: author.name, mine: pin.body, theirs: text, path: `/?in=${encodeURIComponent(projectId)}&view=system` }); });
  }
  return { id: row.id, kind: "area", authorId: author.id, authorName: author.name, authorImage: author.image ?? null, body: text, createdAt: row.createdAt.toISOString(), mine: true, ...(about ? { about } : {}) };
}

/** Only whoever wrote it removes it */
export async function deleteAreaComment(organizationId: string, id: string, userId: string): Promise<void> {
  const gone = await db.delete(A).where(and(eq(A.organizationId, organizationId), eq(A.id, String(id)), eq(A.authorId, userId))).returning({ id: A.id });
  // A pin goes with its answers
  if (gone.length) await db.delete(A).where(and(eq(A.organizationId, organizationId), sql`${A.about}->'pin'->>'to' = ${gone[0].id}`));
}

// ─── What has been happening in a project's system ───────────────────────────────────────────────
// The bento's "latest changes": decisions people wrote or confirmed, what the agent proposed when it read the
// board (one line per reading, however many areas it touched), and what the team said about each area.

export interface ActivityLine {
  id: string;
  /** "decision": a person wrote or confirmed it; "reading": the agent read the board; "comment": a line of the conversation */
  kind: "decision" | "reading" | "comment";
  /** The area it is about; for a reading, the first of the areas it touched */
  area: SystemArea;
  /** A reading: how many areas it touched */
  areas?: number;
  authorName: string; authorImage: string | null;
  text: string; at: string;
}
export interface SystemActivity {
  lines: ActivityLine[];
  /** Per area: how many lines its conversation has and who is in it (at most three) */
  talk: Record<string, { count: number; people: { name: string; image: string | null }[] }>;
  /** Per area: its conversation, oldest first, as criterio.md tells it (lib/criterio-md.ts TalkLine), with the
   *  changes proposed in it */
  notes: Record<string, { id: string; who: string; image: string | null; at: string; mine: boolean; text: string; label?: string; itemId?: string; proposal?: AreaProposal; /** A pin: the line it sits on, where on it, and the pin it answers */ pin?: { quote: string; x: number; to?: string } }[]>;
}

const ACTIVITY_LINES = 6;

export async function systemActivity(organizationId: string, projectId: string, userId?: string): Promise<SystemActivity> {
  await assertProject(organizationId, projectId);
  const R = schema.systemAreaRevision;
  const [revs, notes] = await Promise.all([
    db.select({ id: R.id, area: R.area, decision: R.decision, source: R.source, authorName: R.authorName, authorImage: U.image, createdAt: R.createdAt })
      .from(R).leftJoin(U, eq(U.id, R.authorId))
      .where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId))).orderBy(desc(R.createdAt)).limit(60),
    db.select({ id: A.id, area: A.area, authorId: A.authorId, authorName: A.authorName, authorImage: U.image, body: A.body, about: A.about, createdAt: A.createdAt })
      .from(A).leftJoin(U, eq(U.id, A.authorId))
      .where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId))).orderBy(desc(A.createdAt)),
  ]);
  const lines: ActivityLine[] = [];
  // The agent writes every area it touches at the same instant: that is one reading, not eight changes
  const readings = new Map<string, ActivityLine>();
  for (const r of revs) {
    const at = r.createdAt.toISOString();
    if (r.source === "team") {
      lines.push({ id: r.id, kind: "decision", area: r.area as SystemArea, authorName: r.authorName, authorImage: r.authorImage ?? null, text: r.decision, at });
    } else {
      const seen = readings.get(at);
      if (seen) seen.areas = (seen.areas ?? 1) + 1;
      else { const line: ActivityLine = { id: r.id, kind: "reading", area: r.area as SystemArea, areas: 1, authorName: "", authorImage: null, text: "", at }; readings.set(at, line); lines.push(line); }
    }
  }
  const talk: SystemActivity["talk"] = {};
  const said: SystemActivity["notes"] = {};
  for (const n of notes) {
    const about = cleanAbout(n.about);
    (said[n.area] ??= []).unshift({
      id: n.id, who: n.authorName, image: n.authorImage ?? null, at: n.createdAt.toISOString(), mine: !!userId && n.authorId === userId, text: n.body,
      ...(!about ? {} : "proposal" in about ? { proposal: about.proposal } : "pin" in about ? { pin: about.pin, label: `\u00ab${about.pin.quote.length > 60 ? `${about.pin.quote.slice(0, 59)}\u2026` : about.pin.quote}\u00bb` } : "label" in about ? { label: about.label } : { itemId: about.itemId }),
    });
    lines.push({ id: n.id, kind: "comment", area: n.area as SystemArea, authorName: n.authorName, authorImage: n.authorImage ?? null, text: n.body, at: n.createdAt.toISOString() });
    const t = (talk[n.area] ??= { count: 0, people: [] });
    t.count++;
    if (t.people.length < 3 && !t.people.some((p) => p.name === n.authorName)) t.people.push({ name: n.authorName, image: n.authorImage ?? null });
  }
  lines.sort((a, b) => b.at.localeCompare(a.at));
  // Only the agent's last reading: the ones before it said the same of an older board, and would bury the people
  const lastReading = lines.find((l) => l.kind === "reading");
  return { lines: lines.filter((l) => l.kind !== "reading" || l === lastReading).slice(0, ACTIVITY_LINES), talk, notes: said };
}

// ─── What the next pass reads ────────────────────────────────────────────────────────────────────
// The model passes (lib/system.ts) read, per area, what the team said in its conversation, the proposals it
// said no to and the model's decisions a person rewrote, so a rejected proposal does not come back reworded.

/** What the team said and decided about one area, for the next pass to read */
export interface AreaMemory {
  /** The latest lines of the area's own conversation, oldest first, "Name: text", each cut to ~300 chars */
  said?: string[];
  /** Older lines left out of `said` */
  saidOmitted?: number;
  /** Proposals the team said no to, latest 5: the text it would have had, why it was proposed, who said no */
  rejected?: { decision: string; why?: string; by?: string }[];
  /** Model decisions a person rewrote, latest 2: what the model wrote and what the team made of it */
  rewritten?: { model: string; team: string }[];
}

const SAID = 8;
const SAID_MAX = 300;
const REJECTED = 5;
const REWRITTEN = 2;
const REWRITE_MAX = 400;
const cut = (s: string, max: number) => { const t = s.replace(/\s+/g, " ").trim(); return t.length > max ? `${t.slice(0, max - 1)}…` : t; };

export async function areaMemory(organizationId: string, projectId: string): Promise<Partial<Record<SystemArea, AreaMemory>>> {
  const R = schema.systemAreaRevision;
  const [notes, revs] = await Promise.all([
    db.select({ area: A.area, authorName: A.authorName, body: A.body, about: A.about })
      .from(A).where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId), inArray(A.area, [...SYSTEM_AREAS]))).orderBy(asc(A.createdAt)),
    db.select({ area: R.area, decision: R.decision, source: R.source })
      .from(R).where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId))).orderBy(asc(R.createdAt)),
  ]);
  const said: Record<string, string[]> = {};
  const rejected: Record<string, NonNullable<AreaMemory["rejected"]>> = {};
  const rewritten: Record<string, NonNullable<AreaMemory["rewritten"]>> = {};
  for (const n of notes) {
    const about = cleanAbout(n.about);
    // An open or accepted proposal is already on the board or waiting there; only a no is news to the model
    if (about && "proposal" in about) {
      const p = about.proposal;
      if (p.state === "rejected") (rejected[n.area] ??= []).push({ decision: p.decision, ...(p.why ? { why: p.why } : {}), ...(p.resolvedBy ? { by: p.resolvedBy } : {}) });
      continue;
    }
    (said[n.area] ??= []).push(`${n.authorName}: ${cut(n.body, SAID_MAX)}`);
  }
  const last = new Map<string, { decision: string; source: string }>();
  for (const r of revs) {
    const before = last.get(r.area);
    if (before?.source === "model" && r.source === "team" && before.decision && r.decision && before.decision !== r.decision) {
      (rewritten[r.area] ??= []).push({ model: cut(before.decision, REWRITE_MAX), team: cut(r.decision, REWRITE_MAX) });
    }
    last.set(r.area, r);
  }
  const out: Partial<Record<SystemArea, AreaMemory>> = {};
  for (const area of SYSTEM_AREAS) {
    const lines = said[area] ?? [];
    const m: AreaMemory = {
      ...(lines.length ? { said: lines.slice(-SAID) } : {}),
      ...(lines.length > SAID ? { saidOmitted: lines.length - SAID } : {}),
      ...(rejected[area] ? { rejected: rejected[area].slice(-REJECTED) } : {}),
      ...(rewritten[area] ? { rewritten: rewritten[area].slice(-REWRITTEN) } : {}),
    };
    if (Object.keys(m).length) out[area] = m;
  }
  return out;
}

// ─── Proposals ───────────────────────────────────────────────────────────────────────────────────
// A proposal is a line of an area's conversation that carries the text the area would have. Anyone in the
// workspace says yes (the area takes it, as a decision of the team) or no; either way the line stays, with
// who answered.

export async function resolveProposal(organizationId: string, id: string, accept: boolean, user: { id: string; name: string }): Promise<ProjectSystem> {
  const [row] = await db.select().from(A).where(and(eq(A.organizationId, organizationId), eq(A.id, String(id)))).limit(1);
  const about = cleanAbout(row?.about);
  if (!row || !about || !("proposal" in about) || about.proposal.state !== "open") throw new HttpError(400, (await getErrors()).badBody);
  const { decideArea, setAreaNever, getSystem } = await import("./system");
  if (accept) {
    await decideArea(organizationId, row.projectId, row.area, { decision: about.proposal.decision, why: about.proposal.why }, user);
    const current = (await getSystem(organizationId, row.projectId)).areas.find((a) => a.area === row.area);
    if (about.proposal.never !== (current?.never ?? "")) await setAreaNever(organizationId, row.projectId, row.area, about.proposal.never);
  }
  await db.update(A).set({ about: { proposal: { ...about.proposal, state: accept ? "accepted" : "rejected", resolvedBy: user.name } } }).where(eq(A.id, row.id));
  // Whoever proposed it hears the answer by email, once this has answered (lib/notify.ts)
  const [p] = await db.select({ name: P.name }).from(P).where(eq(P.id, row.projectId)).limit(1);
  inBackground(async () => { await notifyProposalResolved(organizationId, { toUserId: row.authorId, fromUserId: user.id, fromName: user.name, accepted: accept, area: row.area, projectId: row.projectId, projectName: p?.name ?? "", decision: about.proposal.decision }); });
  return getSystem(organizationId, row.projectId);
}
