// Visual feedback on the app (Agentation bar): types and formatting, with no server
// dependencies. Imported by lib/feedback.ts (DB and email) and components/FeedbackTool.tsx.
import type { Annotation } from "agentation";

export type { Annotation };

/** Events accepted by POST /api/feedback */
export type FeedbackEvent =
  /** Each note is saved as it's added or edited, just in case; nothing is sent */
  | { event: "annotation.add" | "annotation.update"; annotation: Annotation; url?: string; viewport?: string }
  | { event: "annotation.delete"; annotation: Annotation; url?: string }
  /** "Send to the team" button: emails all the page's notes */
  | { event: "submit"; output?: string; annotations: Annotation[]; url?: string; viewport?: string };

/** Path + query + hash of a URL, as Agentation shows it in the feedback header */
export function pathOf(url: string | undefined | null, fallback = "/"): string {
  if (!url) return fallback;
  try {
    const u = new URL(url, "https://criterio.design");
    return (u.pathname + u.search + u.hash) || fallback;
  } catch { return fallback; }
}

/**
 * The same markdown Agentation copies at its "standard" level (generateOutput):
 * a header with the page and viewport, and one numbered section per note with the
 * element, its DOM path, the selected text and the comment.
 */
export function feedbackMarkdown(annotations: Annotation[], path: string, viewport?: string | null): string {
  if (!annotations.length) return "";
  let out = `## Page Feedback: ${path}\n`;
  if (viewport) out += `**Viewport:** ${viewport}\n`;
  out += "\n";
  annotations.forEach((a, i) => {
    out += `### ${i + 1}. ${a.element}\n`;
    out += `**Location:** ${a.elementPath}\n`;
    if (a.sourceFile) out += `**Source:** ${a.sourceFile}\n`;
    if (a.reactComponents) out += `**React:** ${a.reactComponents}\n`;
    if (a.selectedText) out += `**Selected text:** "${a.selectedText}"\n`;
    out += `**Feedback:** ${a.comment}\n\n`;
  });
  return out.trim();
}

// ─── What /admin shows ───────────────────────────────────────────────────────

/** A note, reduced to what the panel shows */
export interface FeedbackNoteView {
  id: string;
  element: string;
  elementPath: string;
  comment: string;
  selectedText: string | null;
  sourceFile: string | null;
  reactComponents: string | null;
  createdAt: string;
}

/** Where a submission is: still a draft, sent to the partners, or dealt with */
export type FeedbackStatus = "draft" | "sent" | "resolved";
export const batchStatus = (b: Pick<FeedbackBatch, "sentAt" | "resolvedAt">): FeedbackStatus =>
  b.resolvedAt ? "resolved" : b.sentAt ? "sent" : "draft";

/** A submission (or an unsent draft): one person's notes on one page */
export interface FeedbackBatch {
  key: string;
  author: { id: string; name: string; email: string; image: string | null };
  workspace: string | null;
  path: string;
  url: string;
  viewport: string | null;
  /** When the email went out; null = the person hasn't pressed "Send to the team" yet */
  sentAt: string | null;
  /** When a partner marked it as dealt with; null = open (drafts are never resolved) */
  resolvedAt: string | null;
  /** Last note added or edited */
  updatedAt: string;
  notes: FeedbackNoteView[];
}

export interface FeedbackOverview {
  days: number;
  batches: FeedbackBatch[];
  /** Totals for the period */
  notes: number;
  sent: number;
  pending: number;
  people: number;
}

/** The same markdown as the email, rebuilt from the panel to paste into an agent */
export function batchMarkdown(b: FeedbackBatch): string {
  return feedbackMarkdown(
    b.notes.map((n, i) => ({
      id: n.id, x: 0, y: 0, timestamp: i, comment: n.comment, element: n.element, elementPath: n.elementPath,
      selectedText: n.selectedText ?? undefined, sourceFile: n.sourceFile ?? undefined, reactComponents: n.reactComponents ?? undefined,
    })),
    b.path,
    b.viewport,
  );
}
