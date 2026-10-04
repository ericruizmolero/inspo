// The team talking about one area of a project's system. Two voices meet in one thread: what people wrote
// about the area itself (system_area_comment), and what they said on the references the area draws from
// (inspo_comment on those items), so the thread shows why the decision is what it is and who is behind it.
import "server-only";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import { SYSTEM_AREAS, type SystemArea } from "@/types/system";

const A = schema.systemAreaComment;
const C = schema.inspoComment;
const P = schema.project;
const U = schema.user;

/** What a line points at: an option tried on the sample (the choice to put back, and how it reads) or a reference */
export type AreaAbout = { choice: Record<string, string | number | boolean>; label: string } | { itemId: string };

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
  const key = await assertArea(area);
  const text = String(body ?? "").trim().slice(0, BODY_MAX);
  if (!text) throw new HttpError(400, (await getErrors()).badBody);
  const about = cleanAbout(aboutIn);
  const row = { id: newId(), projectId, organizationId, area: key, authorId: author.id, authorName: author.name, body: text, about, createdAt: new Date() };
  await db.insert(A).values(row);
  return { id: row.id, kind: "area", authorId: author.id, authorName: author.name, authorImage: author.image ?? null, body: text, createdAt: row.createdAt.toISOString(), mine: true, ...(about ? { about } : {}) };
}

/** Only whoever wrote it removes it */
export async function deleteAreaComment(organizationId: string, id: string, userId: string): Promise<void> {
  await db.delete(A).where(and(eq(A.organizationId, organizationId), eq(A.id, String(id)), eq(A.authorId, userId)));
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
  /** Per area: its conversation, oldest first, as criterio.md tells it (lib/criterio-md.ts TalkLine) */
  notes: Record<string, { who: string; text: string; label?: string; itemId?: string }[]>;
}

const ACTIVITY_LINES = 6;

export async function systemActivity(organizationId: string, projectId: string): Promise<SystemActivity> {
  await assertProject(organizationId, projectId);
  const R = schema.systemAreaRevision;
  const [revs, notes] = await Promise.all([
    db.select({ id: R.id, area: R.area, decision: R.decision, source: R.source, authorName: R.authorName, authorImage: U.image, createdAt: R.createdAt })
      .from(R).leftJoin(U, eq(U.id, R.authorId))
      .where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId))).orderBy(desc(R.createdAt)).limit(60),
    db.select({ id: A.id, area: A.area, authorName: A.authorName, authorImage: U.image, body: A.body, about: A.about, createdAt: A.createdAt })
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
    (said[n.area] ??= []).unshift({ who: n.authorName, text: n.body, ...(about && "label" in about ? { label: about.label } : about ? { itemId: about.itemId } : {}) });
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
