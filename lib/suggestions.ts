// What an AI client brings to a project and the team has not answered yet (types/suggestions.ts). References wait as
// library items not filed in the project, answers wait in the brief with source "agent", a drafted plan waits among
// the outlines with `draft`. The team accepts or dismisses each, or all at once, in the app; what it dismisses is kept
// by its key, so the same thing is not proposed again. Server only.
import "server-only";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { addReference, type Piece, type Who } from "./add";
import { findByWeb, deleteItems } from "./items";
import { fileItems } from "./projects";
import { assignEvidence, answerDraftOutline, getSystem, projectRow } from "./system/areas";
import { confirmAnswers, saveAnswers, setClientBrand } from "./brief";
import { rewriteText } from "./text-refs";
import { sha256 } from "./hash";
import { readBrief, unconfirmed } from "@/types/brief";
import { isRefRole, ORIGIN_MAX, type RefRole, type SuggestedRef, type SuggestionKind } from "@/types/suggestions";
import type { SystemArea } from "@/types/system";

const S = schema.projectSuggestion, PI = schema.projectItem, P = schema.project, T = schema.inspoItem;

/** A short, stable fingerprint of a text: the same answer brought twice has the same key */
export const fingerprint = (s: string) => sha256(s.replace(/\s+/g, " ").trim().toLowerCase()).slice(0, 16);
export const textKey = (key: string) => `text:${key.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 120)}`;
export const answerKey = (question: string, text: string) => `answer:${question}:${fingerprint(text)}`;
export const outlineKey = (name: string) => `outline:${name.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 80)}`;

export const cleanOrigin = (s: string | undefined) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, ORIGIN_MAX);

/** Every reference waiting on a workspace's boards, oldest first */
export async function listSuggestions(organizationId: string): Promise<SuggestedRef[]> {
  const rows = await db.select().from(S).where(and(eq(S.organizationId, organizationId), eq(S.kind, "reference"), eq(S.state, "open"))).orderBy(S.createdAt);
  return rows.flatMap((r) => r.itemId ? [{
    id: r.id, projectId: r.projectId, itemId: r.itemId, role: isRefRole(r.role) ? r.role : null, note: r.note,
    origin: r.origin, via: r.via, by: r.byName, at: r.createdAt.toISOString(),
  }] : []);
}

/** The keys the team dismissed on a project */
export async function dismissedKeys(organizationId: string, projectId: string): Promise<Set<string>> {
  const rows = await db.select({ key: S.key }).from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId), eq(S.state, "dismissed")));
  return new Set(rows.map((r) => r.key));
}

export interface Bringing {
  /** What makes it the same suggestion when it comes again (url:<web key>, text:<key>) */
  key: string;
  /** For an address: the page, to find a reference already in the library before building anything */
  web?: string;
  /** Builds what is saved, only when it has to be (a picture is downloaded then) */
  build: () => Promise<Piece>;
  /** For a text: its words, rewritten when the same text comes again */
  text?: string;
  note?: string;
  role?: RefRole | null;
  areas?: SystemArea[];
  origin?: string;
}

export type Brought = { status: "suggested" | "updated" | "on_board" | "dismissed"; itemId?: string; name?: string };

/**
 * One reference an agent brought, left waiting on the project's board. The same key again updates what waits instead
 * of adding it twice; one already on the board stays as it is (its role is set when it had none); one the team
 * dismissed is not brought back.
 */
export async function suggestReference(organizationId: string, projectId: string, b: Bringing, who: Who, via: string | null): Promise<Brought> {
  const [had] = await db.select().from(S).where(and(eq(S.projectId, projectId), eq(S.key, b.key))).limit(1);
  if (had?.state === "dismissed") return { status: "dismissed" };
  const note = String(b.note ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  const origin = cleanOrigin(b.origin);
  const now = new Date();

  // Already filed in the project: nothing waits, it is there
  const known = b.web ? await findByWeb(organizationId, b.web) : had?.itemId ? { id: had.itemId, name: "" } : null;
  if (known && !had) {
    const [link] = await db.select({ role: PI.role }).from(PI).where(and(eq(PI.projectId, projectId), eq(PI.itemId, known.id))).limit(1);
    if (link) {
      if (b.role && !link.role) await db.update(PI).set({ role: b.role }).where(and(eq(PI.projectId, projectId), eq(PI.itemId, known.id)));
      return { status: "on_board", itemId: known.id, name: known.name };
    }
  }

  if (had?.itemId) {
    if (b.text) {
      const [row] = await db.select({ web: T.web }).from(T).where(and(eq(T.organizationId, organizationId), eq(T.id, had.itemId))).limit(1);
      if (row) await rewriteText(organizationId, row.web, b.text);
    }
    await db.update(S).set({ note: note || had.note, role: b.role ?? had.role, areas: b.areas?.length ? b.areas : had.areas, origin: origin || had.origin, via, byName: who.name || who.email, updatedAt: now }).where(eq(S.id, had.id));
    return { status: "updated", itemId: had.itemId };
  }

  const { item, existed } = await addReference(organizationId, await b.build(), who, { note, via, finish: { post: true, tag: "after" } });
  if (!item.id) throw new HttpError(500, "The reference was not saved.");
  // Two calls at once with the same key: the second finds the first's row and updates it
  await db.insert(S).values({
    id: newId(), organizationId, projectId, kind: "reference", key: b.key, state: "open", itemId: item.id, madeItem: !existed,
    role: b.role ?? null, note, areas: b.areas ?? [], origin, via, byName: who.name || who.email, createdBy: who.id, createdAt: now, updatedAt: now,
  }).onConflictDoUpdate({ target: [S.projectId, S.key], set: { note, role: b.role ?? null, origin, updatedAt: now } });
  return { status: "suggested", itemId: item.id, name: item.name };
}

/** Remembers that the team said no to something that is not a reference (an answer, a plan) */
async function remember(organizationId: string, projectId: string, kind: SuggestionKind, key: string, who: Who) {
  const now = new Date();
  await db.insert(S).values({ id: newId(), organizationId, projectId, kind, key, state: "dismissed", byName: who.name || who.email, createdBy: who.id, createdAt: now, updatedAt: now })
    .onConflictDoUpdate({ target: [S.projectId, S.key], set: { state: "dismissed", itemId: null, updatedAt: now } });
}

/** What the team answers: by kind, the ids it means (suggestion ids, question ids, outline ids), or everything open */
export interface Answering { refs?: string[]; answers?: string[]; outlines?: string[]; all?: boolean }

/** Everything an agent left on a project that waits for the team */
export async function pendingOf(organizationId: string, projectId: string) {
  // Only a project of this workspace: anything else is refused, not answered empty
  await projectRow(organizationId, projectId);
  const [refs, [row], system] = await Promise.all([
    db.select({ id: S.id }).from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId), eq(S.kind, "reference"), eq(S.state, "open"))),
    db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1),
    getSystem(organizationId, projectId),
  ]);
  const brief = readBrief(row?.brief);
  return {
    refs: refs.map((r) => r.id),
    answers: Object.entries(brief?.answers ?? {}).filter(([, a]) => unconfirmed(a)).map(([id]) => id),
    outlines: (system.outlines ?? []).filter((o) => o.draft).map((o) => o.id),
  };
}

/** The team takes what an agent proposed: the references are filed (with their role and areas), the answers become
 *  the person's, a drafted plan stays as the project's. Returns how many of each */
export async function acceptSuggestions(organizationId: string, projectId: string, what: Answering, who: Who) {
  const pending = await pendingOf(organizationId, projectId);
  const pick = (ids: string[] | undefined, open: string[]) => what.all ? open : (ids ?? []).filter((id) => open.includes(id));
  const refs = pick(what.refs, pending.refs), answers = pick(what.answers, pending.answers), outlines = pick(what.outlines, pending.outlines);

  if (refs.length) {
    const rows = await db.select().from(S).where(and(eq(S.projectId, projectId), inArray(S.id, refs)));
    const items = rows.flatMap((r) => (r.itemId ? [r.itemId] : []));
    await fileItems(organizationId, projectId, items, who.id);
    for (const r of rows) {
      if (!r.itemId) continue;
      if (r.role) await db.update(PI).set({ role: r.role }).where(and(eq(PI.projectId, projectId), eq(PI.itemId, r.itemId)));
      for (const area of r.areas) await assignEvidence(organizationId, projectId, area, r.itemId, true, { id: who.id, name: who.name || who.email });
      if (r.role === "current-site") await setClientBrand(organizationId, projectId, r.itemId, who.id);
    }
    await db.delete(S).where(and(eq(S.projectId, projectId), inArray(S.id, rows.map((r) => r.id))));
  }
  if (answers.length) await confirmAnswers(organizationId, projectId, answers, who.id);
  for (const id of outlines) await answerDraftOutline(organizationId, projectId, id, true);
  return { refs: refs.length, answers: answers.length, outlines: outlines.length };
}

/** The team says no: a reference leaves the board (and the library, when the suggestion made it and no project holds
 *  it), an answer leaves the brief, a drafted plan goes. Each is remembered, so it is not proposed again */
export async function dismissSuggestions(organizationId: string, projectId: string, what: Answering, who: Who) {
  const pending = await pendingOf(organizationId, projectId);
  const pick = (ids: string[] | undefined, open: string[]) => what.all ? open : (ids ?? []).filter((id) => open.includes(id));
  const refs = pick(what.refs, pending.refs), answers = pick(what.answers, pending.answers), outlines = pick(what.outlines, pending.outlines);

  if (refs.length) {
    const rows = await db.select({ id: S.id, itemId: S.itemId, madeItem: S.madeItem }).from(S).where(and(eq(S.projectId, projectId), inArray(S.id, refs)));
    await db.update(S).set({ state: "dismissed", itemId: null, updatedAt: new Date() }).where(and(eq(S.projectId, projectId), inArray(S.id, refs)));
    const made = rows.filter((r) => r.madeItem && r.itemId).map((r) => r.itemId!);
    if (made.length) {
      // Only what nothing else holds: no project, and no other suggestion
      const [filed, waiting] = await Promise.all([
        db.select({ id: PI.itemId }).from(PI).where(and(eq(PI.organizationId, organizationId), inArray(PI.itemId, made))),
        db.select({ id: S.itemId }).from(S).where(and(eq(S.organizationId, organizationId), inArray(S.itemId, made), ne(S.projectId, projectId))),
      ]);
      const held = new Set([...filed, ...waiting].map((r) => r.id));
      await deleteItems(organizationId, made.filter((id) => !held.has(id)));
    }
  }
  if (answers.length) {
    const [row] = await db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
    const had = readBrief(row?.brief)?.answers ?? {};
    for (const id of answers) if (had[id]) await remember(organizationId, projectId, "answer", answerKey(id, had[id].text), who);
    await saveAnswers(organizationId, projectId, Object.fromEntries(answers.map((id) => [id, { text: "" }])), who.id);
  }
  for (const id of outlines) {
    const name = await answerDraftOutline(organizationId, projectId, id, false);
    if (name) await remember(organizationId, projectId, "outline", outlineKey(name), who);
  }
  return { refs: refs.length, answers: answers.length, outlines: outlines.length };
}

/** The answers and drafted plans waiting on a project, whole, for the app to show */
export async function pendingBody(organizationId: string, projectId: string) {
  await projectRow(organizationId, projectId);
  const [[row], system] = await Promise.all([
    db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1),
    getSystem(organizationId, projectId),
  ]);
  return {
    answers: Object.entries(readBrief(row?.brief)?.answers ?? {}).filter(([, a]) => unconfirmed(a)),
    outlines: (system.outlines ?? []).filter((o) => o.draft),
  };
}

/** How many things wait on a project, for the setup and Tino */
export async function waitingCount(organizationId: string, projectId: string): Promise<number> {
  const rows = await db.select({ id: S.id }).from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId), eq(S.kind, "reference"), eq(S.state, "open"), isNotNull(S.itemId)));
  return rows.length;
}
