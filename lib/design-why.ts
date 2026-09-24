// "Why it's here": the human root of an inspo (the saver's note and the thread) connected
// to what the DESIGN.md measured. Per workspace, because the words are the team's; cached
// until the words or the spec change. Honesty first: a sound on hover is not in a stylesheet,
// and the model must say so instead of finding it.
import "server-only";
import { createHash } from "crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { llm } from "./llm";
import { DesignWhySchema, type DesignSpec, type DesignWhy } from "@/types/design";

// Vision + a bounded judgment over a finished spec: Haiku does it in seconds for a cent.
export const DESIGN_WHY_MODEL = process.env.DESIGN_WHY_MODEL || "anthropic/claude-haiku-4.5";

export interface Voice { author: string; body: string; at: string; kind: "note" | "comment" }

const SYSTEM = `A design team keeps a library of reference websites. For each site they have a DESIGN.md: a structured spec measured from the live page (colors, type, spacing, components, motion). What the spec cannot know is WHY the team saved the site. That is in the words of whoever saved it (the note) and in the comments of the thread.

Your job: connect those words with the spec. For each distinct thing a person points at, say where it is on the page, what measured values are behind it, and what an agent must do to reproduce exactly that.

Rules:
- Be honest above all. Only use the spec, the token values in it and the screenshot. If a person mentions something that cannot be observed from styles or a still image (a sound, a hover behaviour, a scroll effect, a feeling, page speed), mark it "unverifiable", leave "evidence" empty and say in "reproduce" what would be needed to verify it. Never invent a value, an element or a behaviour to complete an answer.
- "measured" only when you can cite concrete values from the spec (token names, hex, px, ms, easing, font, weight). "seen" when the screenshot shows it but the spec has no numbers for it.
- One highlight per distinct thing. When a comment repeats or reinforces an earlier point, merge it into that highlight (keep the first quote, name the author who said it first). Do not add things nobody mentioned.
- A general remark ("the site as a whole", "everything", "nice") is not a highlight: when a sentence mixes a general remark with a concrete one, keep only the concrete part, and never split one sentence into two highlights.
- Quotes stay verbatim and in the person's language. Everything else in English: the DESIGN.md is always in English.
- Short. "where" is 2-8 words; "evidence" and "reproduce" one or two sentences each. Cite tokens by name as the spec does ("Obsidian", "title-lg").
- A note that says nothing concrete ("cool", "check this", a greeting) produces no highlight. If nothing is concrete, return an empty list and an empty gist.`;

export function stampFor(voices: Voice[], specStamp: string): string {
  return createHash("sha1").update(JSON.stringify({ v: voices.map((v) => [v.author, v.body]), s: specStamp })).digest("hex").slice(0, 20);
}

export async function getWhy(organizationId: string, url: string): Promise<{ stamp: string; why: DesignWhy } | null> {
  const [row] = await db.select().from(schema.designWhy)
    .where(and(eq(schema.designWhy.organizationId, organizationId), eq(schema.designWhy.url, url))).limit(1);
  if (!row) return null;
  try { return { stamp: row.stamp, why: JSON.parse(row.whyJson) as DesignWhy }; } catch { return null; }
}

async function saveWhy(organizationId: string, url: string, stamp: string, why: DesignWhy): Promise<void> {
  const row = { id: newId(), organizationId, url, stamp, model: why.model, whyJson: JSON.stringify(why), createdAt: new Date() };
  await db.insert(schema.designWhy).values(row)
    .onConflictDoUpdate({ target: [schema.designWhy.organizationId, schema.designWhy.url], set: { stamp, model: why.model, whyJson: row.whyJson, createdAt: row.createdAt } });
}

export interface BuildResult {
  why: DesignWhy;
  model: string; provider: string | null; requestId: string | null; costUsd: number | null;
  usage: { input: number; output: number; cacheRead: number };
}

export async function buildWhy(input: { spec: DesignSpec; url: string; voices: Voice[]; screenshot?: Buffer | null; signal?: AbortSignal }): Promise<BuildResult> {
  const voices = input.voices.map((v, i) => `${i + 1}. [${v.kind === "note" ? "note of whoever saved it" : "comment"}] ${v.author} (${v.at.slice(0, 10)}): """${v.body}"""`).join("\n");
  const res = await llm({
    model: DESIGN_WHY_MODEL,
    system: SYSTEM,
    image: input.screenshot,
    text: `URL: ${input.url}\n\nWhat the team said, in order:\n${voices}\n\nThe DESIGN.md spec (JSON):\n${JSON.stringify(input.spec)}`,
    schema: DesignWhySchema,
    maxTokens: 4000,
    signal: input.signal,
  });
  const out = DesignWhySchema.parse(JSON.parse(res.text));
  const why: DesignWhy = { ...out, model: res.model, createdAt: new Date().toISOString(), voices: input.voices.length };
  return { why, model: res.model, provider: res.provider, requestId: res.id, costUsd: res.costUsd, usage: res.usage };
}

/** Cached answer if the words and the spec have not changed; otherwise builds, stores and returns it. */
export async function getOrBuildWhy(input: {
  organizationId: string; url: string; voices: Voice[]; specStamp: string; spec: DesignSpec;
  screenshot: () => Promise<Buffer | null>; signal?: AbortSignal;
}): Promise<{ why: DesignWhy; built: BuildResult | null }> {
  const stamp = stampFor(input.voices, input.specStamp);
  const cached = await getWhy(input.organizationId, input.url);
  if (cached && cached.stamp === stamp) return { why: cached.why, built: null };
  const built = await buildWhy({ spec: input.spec, url: input.url, voices: input.voices, screenshot: await input.screenshot(), signal: input.signal });
  await saveWhy(input.organizationId, input.url, stamp, built.why);
  return { why: built.why, built };
}
