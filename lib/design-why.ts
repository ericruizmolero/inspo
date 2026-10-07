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
import type { ProbeReport } from "./design-probe";
import { voiceText } from "./comment-context";
import { DEFAULT_OUTPUT_LANGUAGE, languageRule, type OutputLanguage } from "./output-language";

// Vision + judgment over a finished spec. Haiku padded every answer with prose; Sonnet keeps to values (a few cents).
export const DESIGN_WHY_MODEL = process.env.DESIGN_WHY_MODEL || "anthropic/claude-sonnet-5";

export interface Voice {
  author: string; body: string; at: string; kind: "note" | "comment";
  /** A pinned comment's place on the page, in words (lib/comment-context.ts) */
  place?: string;
  /** The replies under a comment, oldest first */
  replies?: { author: string; body: string }[];
}

const SYSTEM = `You connect what a design team said about a saved website with what was measured on it.

WHAT YOU GET
- The team's words, in order: the note of whoever saved the site, then the comments of its thread. They say WHY the site is in the library.
- The site's DESIGN.md: a spec measured from the live page (colors, type, spacing, components, motion), and a screenshot.
- Sometimes a PROBE REPORT: a headless browser visited the page, hovered the elements the notes point at, counted audio events, checked the cursor, watched the scroll, and captured the sections the notes point at ("captures", each with an id and the section's text).

TASK
For each distinct concrete thing a person points at, return one highlight: their words, the measured values behind it, and the one thing a designer must get right to reproduce it. The reader already sees the spec next to this: give values, not descriptions.

HONESTY
- Use only the spec, its token values, the screenshot and the probe report. Never invent a value, an element or a behaviour to complete an answer.
- status "measured": you can cite concrete values (token names, hex, px, ms, easing, font, weight), or the probe observed it ("color #111 → #e0afa8 on hover, 200ms", "2 audio events while hovering"). A video or a sound of the very interaction the note describes also makes it "measured".
- status "seen": the screenshot or a capture shows it, but there are no numbers for it.
- status "unverifiable": it cannot be observed from styles or a still image (a sound, a hover, a scroll effect, a feeling, page speed) and the probe did not capture it. Leave "values" empty, and say in "note" what would be needed to verify it.
- When the probe looked and found nothing (no audio event, no hover change, no matching element), say so plainly in "note" and keep the status "unverifiable": absence in the probe is not proof of absence on a real visit.

WHAT COUNTS AS A HIGHLIGHT
- One highlight per distinct thing, in the order they said it. A comment that repeats or reinforces an earlier point merges into that highlight: keep the first quote and the author who said it first.
- A general remark ("the site as a whole", "everything", "nice") is not a highlight. When a sentence mixes a general remark with a concrete one, keep only the concrete part. Never split one sentence into two highlights.
- A note with nothing concrete ("cool", "check this", a greeting) gives no highlight. Nothing concrete at all: an empty list.
- Never add things nobody mentioned.

FIELDS
- "quote": the person's words, verbatim and in their own language.
- "values": only for measured things, and only the values that ARE what the person pointed at (that button's color, that menu's transition, that title's font), as chips of 1 to 4 words copied from the spec as it writes them (its token names, numbers and units, in English), never translated and never a description ("left aligned" is not a value). Photos, mockups, illustrations, renders and layouts have no values: never decorate them with radii, gaps or counts from elsewhere in the spec.
- "note": one instruction of at most 22 words for the designer who will reproduce this: the concrete treatment to take (placement, scale, spacing, tone, timing). It never restates the quote, never praises, never mentions the spec or what is missing. Empty when the capture and the values already say it all.
- "shots": the ids of the captures that show exactly that thing, best first, all of them when several do (a note about mockups gets every mockup captured). Captures are images (i…, s…), videos of the browser hovering (v…) or sounds the page played while hovering (a…). Pointing at a capture beats describing it.`;

export function stampFor(voices: Voice[], specStamp: string, language: OutputLanguage = DEFAULT_OUTPUT_LANGUAGE): string {
  // The version bumps when the output shape or the prompt changes, so cached answers are rebuilt
  return createHash("sha1").update(JSON.stringify({ v: voices.map((v) => [v.author, v.body, v.place ?? "", (v.replies ?? []).map((r) => [r.author, r.body])]), s: specStamp, m: DESIGN_WHY_MODEL, l: language, ver: 13 })).digest("hex").slice(0, 20);
}

export async function getWhy(organizationId: string, url: string): Promise<{ stamp: string; why: DesignWhy } | null> {
  const [row] = await db.select().from(schema.designWhy)
    .where(and(eq(schema.designWhy.organizationId, organizationId), eq(schema.designWhy.url, url))).limit(1);
  if (!row) return null;
  return { stamp: row.stamp, why: row.whyJson as DesignWhy };
}

async function saveWhy(organizationId: string, url: string, stamp: string, why: DesignWhy): Promise<void> {
  const row = { id: newId(), organizationId, url, stamp, model: why.model, whyJson: why, createdAt: new Date() };
  await db.insert(schema.designWhy).values(row)
    .onConflictDoUpdate({ target: [schema.designWhy.organizationId, schema.designWhy.url], set: { stamp, model: why.model, whyJson: row.whyJson, createdAt: row.createdAt } });
}

export interface BuildResult {
  why: DesignWhy;
  model: string; provider: string | null; requestId: string | null; costUsd: number | null;
  usage: { input: number; output: number; cacheRead: number };
}

export async function buildWhy(input: { spec: DesignSpec; url: string; voices: Voice[]; screenshot?: Buffer | null; probe?: ProbeReport | null; shotUrls?: Record<string, string>; language?: OutputLanguage; signal?: AbortSignal }): Promise<BuildResult> {
  const voices = input.voices.map((v, i) => `${i + 1}. [${v.kind === "note" ? "note of whoever saved it" : "comment"}] (${v.at.slice(0, 10)}) ${voiceText(v)}`).join("\n");
  const res = await llm({
    model: DESIGN_WHY_MODEL,
    system: `${SYSTEM}\n\n${languageRule(input.language ?? DEFAULT_OUTPUT_LANGUAGE, 'every "note"')}\n- "values" are not text: they stay exactly as the spec writes them. "quote" stays in the person's own words.`,
    image: input.screenshot,
    text: `URL: ${input.url}\n\nWhat the team said, in order:\n${voices}\n\n${input.probe ? `PROBE REPORT (observed by a headless browser):\n${JSON.stringify({ summary: input.probe.summary, audio: input.probe.audio, cursor: input.probe.cursor, scroll: input.probe.scroll, targets: input.probe.targets, captures: input.probe.captures.map((c) => ({ id: c.id, kind: c.kind, hint: c.hint, text: c.text, y: c.box.y, h: c.box.h, ...(c.ms ? { seconds: Math.round(c.ms / 100) / 10 } : {}) })) })}\n\n` : ""}The DESIGN.md spec (JSON):\n${JSON.stringify(input.spec)}`,
    schema: DesignWhySchema,
    maxTokens: 4000,
    signal: input.signal,
  });
  const out = DesignWhySchema.parse(JSON.parse(res.text));
  const urls = input.shotUrls ?? {};
  // Chips only for measured things: for a photo or a mockup, values from elsewhere in the spec are noise
  const highlights = out.highlights.map((h) => {
    const ids = h.shots.filter((id) => id in urls).slice(0, 10);
    const of = (prefixes: string[]) => ids.filter((id) => prefixes.some((p) => id.startsWith(p))).map((id) => urls[id]);
    return { ...h, values: h.status === "measured" ? h.values.slice(0, 6) : [], note: h.note.trim(), shots: ids, shotUrls: of(["i", "s"]), videoUrls: of(["v"]), audioUrls: of(["a"]) };
  });
  const why: DesignWhy = { highlights, model: res.model, createdAt: new Date().toISOString(), voices: input.voices.length, ...(input.probe ? { probe: { summary: input.probe.summary, ms: input.probe.ms, captures: input.probe.captures.length, hovered: input.probe.targets.reduce((n, t) => n + t.elements.length, 0), audioEvents: input.probe.targets.reduce((n, t) => n + t.elements.reduce((m, e) => m + e.audioEvents, 0), 0) } } : {}) };
  return { why, model: res.model, provider: res.provider, requestId: res.id, costUsd: res.costUsd, usage: res.usage };
}

// One build per workspace and site at a time: the sheet and a second tab must not pay twice
// (or race, with the loser overwriting the winner's captures). The job outlives the request that
// started it: a client that leaves (React's double effect in dev, a closed tab) must not abort a
// build another client is waiting for, so no request signal reaches the probe or the model.
const inflight = new Map<string, Promise<{ why: DesignWhy; built: BuildResult | null; stale: false }>>();

export type WhyResult = { why: DesignWhy; built: BuildResult | null; stale: boolean };

/**
 * Cached answer if the words and the spec have not changed. Otherwise: with `background` given and an
 * older answer at hand, that older answer comes back at once (`stale: true`) and the rebuild runs behind
 * it, so the sheet never waits twice for the same site; with nothing cached, it builds and waits.
 */
export function getOrBuildWhy(input: {
  organizationId: string; url: string; voices: Voice[]; specStamp: string; spec: DesignSpec;
  screenshot: () => Promise<Buffer | null>; probe?: () => Promise<{ report: ProbeReport; shotUrls: Record<string, string> } | null>; language?: OutputLanguage;
  /** Keeps a promise alive after the response (Next's `after`): enables stale-while-rebuild */
  background?: (job: Promise<unknown>) => void;
  /** False when the workspace has no AI actions left: the saved answer, however old, or null */
  build?: boolean;
}): Promise<WhyResult | null> {
  const key = `${input.organizationId}|${input.url}`;
  const running = inflight.get(key);
  if (running) return running;
  const stamp = stampFor(input.voices, input.specStamp, input.language);
  if (input.build === false) {
    return getWhy(input.organizationId, input.url).then((cached) => cached ? { why: cached.why, built: null, stale: cached.stamp !== stamp } : null);
  }
  const job = (async (): Promise<{ why: DesignWhy; built: BuildResult | null; stale: false }> => {
    const cached = await getWhy(input.organizationId, input.url);
    if (cached && cached.stamp === stamp) return { why: cached.why, built: null, stale: false };
    // A probe that broke (browser down, model hiccup) must not freeze a capture-less answer:
    // the row is saved under a stamp that never matches, so the next open tries again
    let probeFailed = false;
    const probe = input.probe ? input.probe().catch((e) => { probeFailed = true; console.error("design-why probe failed:", input.url, e instanceof Error ? e.message : e); return null; }) : Promise.resolve(null);
    const [screenshot, probed] = await Promise.all([input.screenshot(), probe]);
    const built = await buildWhy({ spec: input.spec, url: input.url, voices: input.voices, screenshot, probe: probed?.report ?? null, shotUrls: probed?.shotUrls, language: input.language });
    await saveWhy(input.organizationId, input.url, probeFailed ? `${stamp}~retry` : stamp, built.why);
    return { why: built.why, built, stale: false };
  })().finally(() => { inflight.delete(key); });
  inflight.set(key, job);
  if (!input.background) return job;
  // An older answer is better than a spinner: hand it over and let the job finish behind the response
  return getWhy(input.organizationId, input.url).then((cached): WhyResult | Promise<WhyResult> => {
    if (!cached || cached.stamp === stamp) return job;
    input.background!(job.catch((e) => console.error("design-why background rebuild failed:", input.url, e instanceof Error ? e.message : e)));
    return { why: cached.why, built: null, stale: true };
  });
}
