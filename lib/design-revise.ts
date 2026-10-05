// DESIGN.md revisions per workspace: a person disagrees with a section,
// a model fixes the structured spec and the change is logged with author and summary.
import "server-only";
import { z } from "zod";
import { desc, and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { DesignSpecSchema, renderDesignMd, stripDashes, type DesignSpec } from "@/types/design";
import { DEFAULT_OUTPUT_LANGUAGE, languageName, type OutputLanguage } from "./output-language";
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
  brief: "Brief (typography, imagery, logo, motion, color, iconography, voice, framework)",
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
  return { meta: toMeta(row), spec: DesignSpecSchema.parse(row.specJson) };
}

export async function getRevisionSpec(organizationId: string, id: string): Promise<{ meta: RevisionMeta; spec: DesignSpec } | null> {
  const [row] = await db.select().from(schema.designRevision)
    .where(and(eq(schema.designRevision.organizationId, organizationId), eq(schema.designRevision.id, id))).limit(1);
  if (!row) return null;
  return { meta: toMeta(row), spec: DesignSpecSchema.parse(row.specJson) };
}

export async function addRevision(input: {
  organizationId: string; url: string; authorId: string; authorName: string;
  kind: RevisionMeta["kind"]; section?: string | null; comment?: string; summary: string; warning?: string | null; spec: DesignSpec;
}): Promise<RevisionMeta> {
  const row = {
    id: newId(), organizationId: input.organizationId, url: input.url,
    authorId: input.authorId, authorName: input.authorName, kind: input.kind,
    section: input.section ?? null, comment: input.comment ?? "", summary: input.summary,
    warning: input.warning ?? null, specJson: input.spec, createdAt: new Date(),
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
const systemFor = (language: OutputLanguage) => `You maintain the DESIGN.md of a website for a design team. A team member disagrees with one part of the spec. Apply the change with judgment and return the corrected spec.

WHAT YOU GET
The site's URL, the section the comment refers to, the comment, the current spec (JSON) and a screenshot.

HOW TO APPLY IT
- The person knows the brand: their judgment overrides what was generated automatically. Apply what they ask.
- Propagate the change to everything that depends on it. If a color changes, update its role, the components that use it, the description, the brief, the rules and the prompt for agents. The spec must stay coherent.
- Touch nothing the comment does not affect. Keep every other text and value verbatim.
- If the comment contradicts something clearly measured or visible in the screenshot (it says the background is white and the screenshot is black), apply it anyway and flag it in "warning".
- If the comment is ambiguous, take the most reasonable reading and explain it in "summary".
- If the comment asks for no change (a test, a question, nothing concrete), return "changed": false and "patch": "{}", and say in "summary" what you would need to apply it.

OUTPUT
- "patch" is a string holding a JSON object with only the top-level keys that change, each one complete: touch one color and you return the whole "colors" array; touch one rule and you return the whole "dos" or "donts".
- Keep the schema's limits: 4 to 12 colors, 6 to 9 scale steps, 5 to 7 rules of each kind.
- Fixed values stay within their lists, since nothing checks them until you are done: "theme" is light or dark; a color's "group" is brand, accent, neutral or semantic; a font's "role" is display, body, mono or ui (mono only for monospaced families); "density" is compact, comfortable or airy. A headline font is "display".
- No dashes as punctuation.

LANGUAGE
- The spec is written in English, whatever language the current spec or the comment is in. The one exception is "es": the tagline and the brief in Castilian Spanish. If you change the tagline or the brief, return "es" updated too.
- Write "summary" and "warning" in ${languageName(language)}, natural and direct: the person reads those two on screen. Font names, hex and CSS values stay as given.`;

export async function reviseDesignSpec(input: {
  spec: DesignSpec; url: string; section: string; comment: string; screenshot?: Buffer | null; language?: OutputLanguage;
}): Promise<{ changed: boolean; spec: DesignSpec; summary: string; warning: string | null; model: string; provider: string | null; requestId: string | null; costUsd: number | null; usage: { input: number; output: number; cacheRead: number } }> {
  const res = await llm({
    model: MODEL,
    system: systemFor(input.language ?? DEFAULT_OUTPUT_LANGUAGE),
    image: input.screenshot,
    text: `URL: ${input.url}\nSection the comment refers to: ${SECTIONS[input.section] ?? input.section}\n\nThe person's comment:\n"""\n${input.comment}\n"""\n\nCurrent spec (JSON):\n${JSON.stringify(input.spec)}`,
    schema: ReviseOutput,
    maxTokens: 16000,
  });
  const text = res.text;
  const out = ReviseOutput.parse(JSON.parse(text));
  const patch = DesignSpecSchema.partial().parse(JSON.parse(out.patch || "{}"));
  const spec = out.changed ? stripDashes(DesignSpecSchema.parse({ ...input.spec, ...patch })) : input.spec;
  return { changed: out.changed, spec, summary: out.summary, warning: out.warning, model: res.model, provider: res.provider, requestId: res.id, costUsd: res.costUsd, usage: res.usage };
}
