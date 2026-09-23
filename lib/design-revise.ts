// DESIGN.md revisions per workspace: a person disagrees with a section,
// a model fixes the structured spec and the change is logged with author and summary.
import "server-only";
import { z } from "zod";
import { desc, and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { DesignSpecSchema, renderDesignMd, type DesignSpec } from "@/types/design";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { llm } from "./llm";

// Revising is rewriting a finished spec with a bounded change: Sonnet handles it well in a third of Opus's time.
const MODEL = process.env.DESIGN_REVISE_MODEL || "anthropic/claude-sonnet-5";

export const SECTIONS: Record<string, string> = {
  general: "Identity and description",
  color: "Color",
  typography: "Typography",
  spacing: "Spacing and shape",
  components: "Components",
  rules: "Rules",
  system: "System (elevation, layout, imagery, motion)",
  related: "Related brands",
  prompt: "Prompt for agents",
};

export interface RevisionMeta {
  id: string;
  kind: "regeneration" | "revision" | "reversion";
  authorName: string;
  section: string | null;
  comment: string;
  summary: string;
  warning: string | null;
  createdAt: string;
}


const toMeta = (r: typeof schema.designRevision.$inferSelect): RevisionMeta => ({
  id: r.id, kind: r.kind as RevisionMeta["kind"], authorName: r.authorName, section: r.section,
  comment: r.comment, summary: r.summary, warning: r.warning, createdAt: r.createdAt.toISOString(),
});

export async function listRevisions(organizationId: string, url: string): Promise<RevisionMeta[]> {
  const rows = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.url, url)))
    .orderBy(desc(schema.designRevision.createdAt));
  return rows.map(toMeta);
}

/** The workspace's current spec for that URL, or null if never revised */
export async function latestRevision(organizationId: string, url: string): Promise<{ meta: RevisionMeta; spec: DesignSpec } | null> {
  const [row] = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.url, url)))
    .orderBy(desc(schema.designRevision.createdAt)).limit(1);
  if (!row) return null;
  return { meta: toMeta(row), spec: DesignSpecSchema.parse(JSON.parse(row.specJson)) };
}

export async function getRevisionSpec(organizationId: string, id: string): Promise<{ meta: RevisionMeta; spec: DesignSpec } | null> {
  const [row] = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.id, id))).limit(1);
  if (!row) return null;
  return { meta: toMeta(row), spec: DesignSpecSchema.parse(JSON.parse(row.specJson)) };
}

export async function addRevision(input: {
  organizationId: string; url: string; authorId: string; authorName: string;
  kind: RevisionMeta["kind"]; section?: string | null; comment?: string; summary: string; warning?: string | null; spec: DesignSpec;
}): Promise<RevisionMeta> {
  const row = {
    id: newId(), organizationId: input.organizationId, url: input.url,
    authorId: input.authorId, authorName: input.authorName, kind: input.kind,
    section: input.section ?? null, comment: input.comment ?? "", summary: input.summary,
    warning: input.warning ?? null, specJson: JSON.stringify(input.spec), createdAt: new Date(),
  };
  await db.insert(schema.designRevision).values(row);
  return toMeta({ ...row });
}

/** Applies the workspace's current spec (if any) over the global entry */
export async function overlayRevision<T extends { url: string; spec?: DesignSpec; markdown: string; generatedAt: string }>(
  organizationId: string, entry: T
): Promise<T & { revisions: RevisionMeta[] }> {
  const revisions = await listRevisions(organizationId, entry.url);
  if (!revisions.length) return { ...entry, revisions };
  const latest = await getRevisionSpec(organizationId, revisions[0].id);
  if (!latest) return { ...entry, revisions };
  const date = latest.meta.createdAt.slice(0, 10);
  return { ...entry, spec: latest.spec, markdown: renderDesignMd(latest.spec, entry.url, date), revisions };
}

// ─── Model ───────────────────────────────────────────────────────────────────

// The model returns only the top-level keys that change (not the whole spec): output
// drops from ~10k tokens to a few hundred and the revision takes seconds instead of a minute.
const ReviseOutput = z.object({
  changed: z.boolean().describe("true if the comment asked for a change and you applied it; false if it asked for nothing concrete (a test, a question, an empty comment)"),
  // A JSON string instead of an object: 17 optional or nullable keys exceed the union limit
  // of Anthropic's strict schema (16). DesignSpecSchema.partial() validates it on return.
  patch: z.string().describe("JSON object with only the top-level spec keys that change, each one complete (if a color changes, the whole 'colors' array). \"{}\" if changed is false."),
  summary: z.string().describe("2-3 sentences: what exactly you changed and which parts of the spec it propagated to"),
  warning: z.string().nullable().describe("If the comment contradicts values that are clearly measured or visible, say so here in one sentence. Otherwise, null."),
});

// The summary and warning are read on screen, so they come out in the viewer's
// language. The spec itself doesn't: that's #27 (the DESIGN.md is always generated in English).
const LANGUAGE: Record<Locale, string> = {
  en: "Write \"summary\" and \"warning\" in English",
  es: "Write \"summary\" and \"warning\" in Castilian Spanish (Spanish from Spain)",
};

const systemFor = (locale: Locale) => `You maintain the DESIGN.md of a website for a design team. You receive the current structured spec and a comment from a team member who disagrees with one part. Your job is to apply that change with judgment and return the complete corrected spec.

Rules:
- Apply what the person asks for. They know the brand; their judgment overrides what was generated automatically.
- Propagate the change to everything that depends on it: if a color changes, update its role, the components that use it, the description, the rules and the prompt for agents. The spec must stay coherent.
- Don't touch anything the comment doesn't affect. Keep the rest of the texts and values verbatim.
- If the comment contradicts something clearly measured or visible in the screenshot (e.g. it says the background is white and the screenshot is black), apply it anyway but flag it in "warning".
- If the comment is ambiguous, pick the most reasonable interpretation and explain it in "summary".
- If the comment asks for no change (it's a test, a question or says nothing concrete), return "changed": false, "patch" "{}" and explain in "summary" what you'd need to be able to apply it.
- "patch" is a string with a JSON object. It carries only the top-level keys that change, but each one complete: if you touch a color, the whole "colors" array with all colors; if you touch a rule, the whole "dos" or "donts". Don't include keys that don't change.
- The spec text is in English (#27), even if the current spec or the comment is in Spanish.
- ${LANGUAGE[locale]}: the person reads those two on screen.
- Respect the schema constraints: between 4 and 12 colors, 6-9 scale steps, 5-7 rules of each kind.`;

export async function reviseDesignSpec(input: {
  spec: DesignSpec; url: string; section: string; comment: string; screenshot?: Buffer | null; locale?: Locale;
}): Promise<{ changed: boolean; spec: DesignSpec; summary: string; warning: string | null; model: string; provider: string | null; requestId: string | null; costUsd: number | null; usage: { input: number; output: number; cacheRead: number } }> {
  const res = await llm({
    model: MODEL,
    system: systemFor(input.locale ?? DEFAULT_LOCALE),
    image: input.screenshot,
    text: `URL: ${input.url}\nSection the comment refers to: ${SECTIONS[input.section] ?? input.section}\n\nThe person's comment:\n"""\n${input.comment}\n"""\n\nCurrent spec (JSON):\n${JSON.stringify(input.spec)}`,
    schema: ReviseOutput,
    maxTokens: 16000,
  });
  const text = res.text;
  const out = ReviseOutput.parse(JSON.parse(text));
  const patch = DesignSpecSchema.partial().parse(JSON.parse(out.patch || "{}"));
  const spec = out.changed ? DesignSpecSchema.parse({ ...input.spec, ...patch }) : input.spec;
  return { changed: out.changed, spec, summary: out.summary, warning: out.warning, model: res.model, provider: res.provider, requestId: res.id, costUsd: res.costUsd, usage: res.usage };
}
