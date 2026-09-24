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
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";

// Vision + judgment over a finished spec. Haiku padded every answer with prose; Sonnet keeps to values (a few cents).
export const DESIGN_WHY_MODEL = process.env.DESIGN_WHY_MODEL || "anthropic/claude-sonnet-5";

export interface Voice { author: string; body: string; at: string; kind: "note" | "comment" }

const SYSTEM = `A design team keeps a library of reference websites. For each site they have a DESIGN.md: a structured spec measured from the live page (colors, type, spacing, components, motion). What the spec cannot know is WHY the team saved the site. That is in the words of whoever saved it (the note) and in the comments of the thread.

Your job: connect those words with the spec. For each distinct concrete thing a person points at, say where it is on the page, which measured values are behind it (as short chips), and the one decision an agent must get right to reproduce it. The reader is a designer who already sees the spec next to this: give values, not descriptions.

Rules:
- Be honest above all. Only use the spec, the token values in it and the screenshot. If a person mentions something that cannot be observed from styles or a still image (a sound, a hover behaviour, a scroll effect, a feeling, page speed), mark it "unverifiable", leave "evidence" empty and say in "reproduce" what would be needed to verify it. Never invent a value, an element or a behaviour to complete an answer.
- "measured" only when you can cite concrete values from the spec (token names, hex, px, ms, easing, font, weight). "seen" when the screenshot shows it but the spec has no numbers for it.
- One highlight per distinct thing. When a comment repeats or reinforces an earlier point, merge it into that highlight (keep the first quote, name the author who said it first). Do not add things nobody mentioned.
- A general remark ("the site as a whole", "everything", "nice") is not a highlight: when a sentence mixes a general remark with a concrete one, keep only the concrete part, and never split one sentence into two highlights.
- Quotes stay verbatim and in the person's language. "note" is read on screen by the team: write it in the language given below. Values are values (hex, px, ms, token names) in any language.
- Short and dense. "values" exist only for measured things, and only the values that ARE what the person pointed at (that button's color, that menu's transition, that title's font), as chips of 1-4 words from the spec. Photos, mockups, illustrations, renders and layouts have no values: never decorate them with radii, gaps or counts from elsewhere in the spec. "note" is one instruction of at most 22 words for the designer who will reproduce this: the concrete treatment to take (placement, scale, spacing, tone, timing). It never restates the quote, never praises, never mentions the spec or what is missing. Only when it adds something the capture does not show by itself; otherwise empty.
- You may also receive a PROBE REPORT: a headless browser visited the page, hovered the elements the notes point at, counted audio events, checked the cursor, watched the scroll and CAPTURED the sections the notes point at (the "captures" list, each with an id and the section's text). Hover and audio observations count as "measured": cite them ("color #111 → #e0afa8 on hover, 200ms", "2 audio events while hovering"). When the probe looked and found nothing (no audio event, no hover change, no matching element), say so plainly in the note and keep the status "unverifiable": absence in the probe is not proof of absence on a real visit.
- For each highlight, list in "shots" the ids of the captures that show exactly that thing: all of them when several do (a note about mockups gets every mockup captured), in the best order first. Captures can be images (i…, s…), a video of the browser hovering the elements (v…) or a sound the page played while hovering (a…). A capture is worth more than any description: prefer pointing at it over describing what it shows. A video or a sound of the very interaction the note describes makes that highlight "measured".
- A note that says nothing concrete ("cool", "check this", a greeting) produces no highlight. If nothing is concrete, return an empty list and an empty gist.`;

export function stampFor(voices: Voice[], specStamp: string, locale: Locale = DEFAULT_LOCALE): string {
  // The version bumps when the output shape or the prompt changes, so cached answers are rebuilt
  return createHash("sha1").update(JSON.stringify({ v: voices.map((v) => [v.author, v.body]), s: specStamp, m: DESIGN_WHY_MODEL, l: locale, ver: 11 })).digest("hex").slice(0, 20);
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

const LANGUAGE: Record<Locale, string> = {
  en: "Write \"where\" and \"note\" in English.",
  es: "Write \"where\" and \"note\" in Castilian Spanish (Spanish from Spain).",
};

export async function buildWhy(input: { spec: DesignSpec; url: string; voices: Voice[]; screenshot?: Buffer | null; probe?: ProbeReport | null; shotUrls?: Record<string, string>; locale?: Locale; signal?: AbortSignal }): Promise<BuildResult> {
  const voices = input.voices.map((v, i) => `${i + 1}. [${v.kind === "note" ? "note of whoever saved it" : "comment"}] ${v.author} (${v.at.slice(0, 10)}): """${v.body}"""`).join("\n");
  const res = await llm({
    model: DESIGN_WHY_MODEL,
    system: `${SYSTEM}\n\nLanguage: ${LANGUAGE[input.locale ?? DEFAULT_LOCALE]}`,
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
  screenshot: () => Promise<Buffer | null>; probe?: () => Promise<{ report: ProbeReport; shotUrls: Record<string, string> } | null>; locale?: Locale;
  /** Keeps a promise alive after the response (Next's `after`): enables stale-while-rebuild */
  background?: (job: Promise<unknown>) => void;
}): Promise<WhyResult> {
  const key = `${input.organizationId}|${input.url}`;
  const running = inflight.get(key);
  if (running) return running;
  const stamp = stampFor(input.voices, input.specStamp, input.locale);
  const job = (async (): Promise<{ why: DesignWhy; built: BuildResult | null; stale: false }> => {
    const cached = await getWhy(input.organizationId, input.url);
    if (cached && cached.stamp === stamp) return { why: cached.why, built: null, stale: false };
    // A probe that broke (browser down, model hiccup) must not freeze a capture-less answer:
    // the row is saved under a stamp that never matches, so the next open tries again
    let probeFailed = false;
    const probe = input.probe ? input.probe().catch((e) => { probeFailed = true; console.error("design-why probe failed:", input.url, e instanceof Error ? e.message : e); return null; }) : Promise.resolve(null);
    const [screenshot, probed] = await Promise.all([input.screenshot(), probe]);
    const built = await buildWhy({ spec: input.spec, url: input.url, voices: input.voices, screenshot, probe: probed?.report ?? null, shotUrls: probed?.shotUrls, locale: input.locale });
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
