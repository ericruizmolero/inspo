// Visual feedback on the app: saves each Agentation bar note as it arrives and,
// when the person presses "Send to the team", emails all the notes for that page
// to the partners (those who see /admin, lib/activity.ts) with the same markdown the
// bar copies. No automatic sends: only what the person decides to send goes out.
import { and, desc, eq, gte, inArray, isNotNull, isNull } from "drizzle-orm";
import "server-only";
import { db, schema } from "./db";
import { listAdmins } from "./activity";
import { feedbackMail, sendMail, localeForEmail } from "./mail";
import { feedbackMarkdown, pathOf, type Annotation, type FeedbackBatch, type FeedbackEvent, type FeedbackNoteView, type FeedbackOverview } from "./feedback-core";
import { getErrors } from "./i18n";

export * from "./feedback-core";

export interface FeedbackAuthor { id: string; name: string; email: string }

const F = schema.feedbackNote;
const noteId = (annotationId: string | number, userId: string) => `${String(annotationId).slice(0, 40)}@${userId}`;

/** Trims huge fields (computed styles, nearby HTML) so the row doesn't bloat */
function slim(a: Annotation): Annotation {
  const cut = (s: string | undefined, n: number) => (typeof s === "string" && s.length > n ? s.slice(0, n) + "…" : s);
  return {
    ...a,
    comment: String(a.comment ?? "").slice(0, 4000),
    element: String(a.element ?? "Element").slice(0, 200),
    elementPath: String(a.elementPath ?? "").slice(0, 600),
    selectedText: cut(a.selectedText, 1000),
    nearbyText: cut(a.nearbyText, 500),
    nearbyElements: cut(a.nearbyElements, 500),
    computedStyles: cut(a.computedStyles, 1500),
    fullPath: cut(a.fullPath, 1000),
    cssClasses: cut(a.cssClasses, 500),
    accessibility: cut(a.accessibility, 500),
    reactComponents: cut(a.reactComponents, 300),
    sourceFile: cut(a.sourceFile, 300),
    thread: undefined,
  };
}

const validAnnotation = (a: unknown): a is Annotation =>
  !!a && typeof a === "object" && (typeof (a as Annotation).id === "string" || typeof (a as Annotation).id === "number");

/** Saves or updates notes (without touching sentAt on those already sent) */
async function upsert(author: FeedbackAuthor, organizationId: string | null, annotations: Annotation[], url: string, viewport: string | null) {
  if (!annotations.length) return;
  const now = new Date();
  const path = pathOf(url);
  for (const a of annotations) {
    const data = JSON.stringify(slim(a));
    await db.insert(F).values({
      id: noteId(a.id, author.id), userId: author.id, organizationId, path, url, viewport,
      data, createdAt: now, updatedAt: now, sentAt: null,
    }).onConflictDoUpdate({ target: F.id, set: { data, updatedAt: now, url, path } });
  }
}

/** Handles a bar event. Returns how many emails went out (1 only on submit). */
export async function handleFeedbackEvent(author: FeedbackAuthor, organizationId: string | null, ev: FeedbackEvent): Promise<{ sent: number }> {
  const url = String(ev.url ?? "").slice(0, 1000);
  const viewport = "viewport" in ev && typeof ev.viewport === "string" ? ev.viewport.slice(0, 40) : null;

  switch (ev.event) {
    case "annotation.add":
    case "annotation.update":
      if (!validAnnotation(ev.annotation)) throw new Error((await getErrors()).missingAnnotation);
      await upsert(author, organizationId, [ev.annotation], url, viewport);
      return { sent: 0 };
    case "annotation.delete":
      // Only removed if not yet emailed; what's sent stays sent
      if (validAnnotation(ev.annotation)) await db.delete(F).where(and(eq(F.id, noteId(ev.annotation.id, author.id)), isNull(F.sentAt)));
      return { sent: 0 };
    case "submit": {
      const annotations = (Array.isArray(ev.annotations) ? ev.annotations : []).filter(validAnnotation);
      if (!annotations.length) throw new Error((await getErrors()).noNotesToSend);
      await upsert(author, organizationId, annotations, url, viewport);
      const path = pathOf(url);
      const markdown = typeof ev.output === "string" && ev.output.trim() ? ev.output.trim().slice(0, 60000) : feedbackMarkdown(annotations.map(slim), path, viewport);
      const to = (await listAdmins()).map((a) => a.email);
      if (!to.length) throw new Error((await getErrors()).nobodyToNotify);
      // Goes to the partners; the language is that of the first on the list, who reads it
      const m = feedbackMail({ author, path, url, count: annotations.length, markdown, at: new Date() }, await localeForEmail(to[0]));
      await sendMail(to, m.subject, m.html, m.text, { replyTo: author.email });
      await db.update(F).set({ sentAt: new Date() }).where(inArray(F.id, annotations.map((a) => noteId(a.id, author.id))));
      return { sent: 1 };
    }
    default:
      throw new Error((await getErrors()).unknownEvent);
  }
}

type Row = {
  id: string; userId: string; path: string; url: string; viewport: string | null; data: string;
  createdAt: Date; updatedAt: Date; sentAt: Date | null; resolvedAt: Date | null;
  name: string; email: string; image: string | null; workspace: string | null;
};

const selection = {
  id: F.id, userId: F.userId, path: F.path, url: F.url, viewport: F.viewport, data: F.data,
  createdAt: F.createdAt, updatedAt: F.updatedAt, sentAt: F.sentAt, resolvedAt: F.resolvedAt,
  name: schema.user.name, email: schema.user.email, image: schema.user.image,
  workspace: schema.organization.name,
};

/**
 * Groups rows by submission: the notes one person sent together about a page (same sentAt)
 * or, if they haven't pressed send yet, their draft. Most recent first; inside a submission,
 * in the order the notes were left (as in the email).
 */
function groupBatches(rows: Row[]): FeedbackBatch[] {
  const batches = new Map<string, FeedbackBatch & { order: number[] }>();
  for (const r of rows) {
    let a: Partial<Annotation> = {};
    try { a = JSON.parse(r.data) as Partial<Annotation>; } catch { /* old or broken row: shown empty */ }
    const key = `${r.userId}|${r.path}|${r.sentAt ? r.sentAt.getTime() : "draft"}`;
    let b = batches.get(key);
    if (!b) {
      b = {
        key, author: { id: r.userId, name: r.name, email: r.email, image: r.image ?? null }, workspace: r.workspace ?? null,
        path: r.path, url: r.url, viewport: r.viewport ?? null,
        sentAt: r.sentAt ? r.sentAt.toISOString() : null, resolvedAt: null, updatedAt: r.updatedAt.toISOString(), notes: [], order: [],
      };
      batches.set(key, b);
    }
    if (r.updatedAt.toISOString() > b.updatedAt) b.updatedAt = r.updatedAt.toISOString();
    // A submission is resolved as a whole; the latest mark wins if the notes ever differ
    if (r.resolvedAt && (!b.resolvedAt || r.resolvedAt.toISOString() > b.resolvedAt)) b.resolvedAt = r.resolvedAt.toISOString();
    const note: FeedbackNoteView = {
      id: r.id, element: String(a.element ?? "Element"), elementPath: String(a.elementPath ?? ""), comment: String(a.comment ?? ""),
      selectedText: a.selectedText ? String(a.selectedText) : null, sourceFile: a.sourceFile ? String(a.sourceFile) : null,
      reactComponents: a.reactComponents ? String(a.reactComponents) : null, createdAt: r.createdAt.toISOString(),
    };
    b.notes.push(note);
    b.order.push(typeof a.timestamp === "number" ? a.timestamp : r.createdAt.getTime());
  }

  const list = [...batches.values()].map((b) => {
    const idx = b.notes.map((_, i) => i).sort((i, j) => b.order[i] - b.order[j]);
    const { order: _order, ...rest } = b;
    return { ...rest, notes: idx.map((i) => b.notes[i]) };
  });
  list.sort((x, y) => (y.sentAt ?? y.updatedAt).localeCompare(x.sentAt ?? x.updatedAt));
  return list;
}

/** Feedback from the last N days for /admin, grouped by submission. Most recent first. */
export async function feedbackOverview(days: number): Promise<FeedbackOverview> {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db
    .select(selection)
    .from(F)
    .innerJoin(schema.user, eq(schema.user.id, F.userId))
    .leftJoin(schema.organization, eq(schema.organization.id, F.organizationId))
    .where(gte(F.updatedAt, since))
    .orderBy(desc(F.updatedAt));
  const list = groupBatches(rows);
  return {
    days, batches: list,
    notes: rows.length,
    sent: list.filter((b) => b.sentAt).length,
    pending: list.filter((b) => !b.sentAt).length,
    people: new Set(rows.map((r) => r.userId)).size,
  };
}

/** Everything one person has left with the bar, for /settings/feedback: sent, resolved and drafts. */
export async function feedbackHistory(userId: string): Promise<FeedbackBatch[]> {
  const rows = await db
    .select(selection)
    .from(F)
    .innerJoin(schema.user, eq(schema.user.id, F.userId))
    .leftJoin(schema.organization, eq(schema.organization.id, F.organizationId))
    .where(eq(F.userId, userId))
    .orderBy(desc(F.updatedAt));
  return groupBatches(rows);
}

/** Marks notes as dealt with, or reopens them (from /admin). Drafts are skipped: nothing was sent. */
export async function resolveFeedbackNotes(ids: string[], resolved: boolean): Promise<number> {
  if (!ids.length) return 0;
  const rows = await db.update(F).set({ resolvedAt: resolved ? new Date() : null })
    .where(and(inArray(F.id, ids), isNotNull(F.sentAt))).returning({ id: F.id });
  return rows.length;
}

/** Deletes notes by id (from /admin). Returns how many there were. */
export async function deleteFeedbackNotes(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const rows = await db.delete(F).where(inArray(F.id, ids)).returning({ id: F.id });
  return rows.length;
}
