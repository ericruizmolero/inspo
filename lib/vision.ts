// Vision step: a vision model describes a site's screenshot in short text so that
// Jev (text only) can judge visual traits (typography, illustration, palette…).
import { getOrCaptureShot } from "./screenshot";
import { llm, llmEnabled } from "./llm";

// Describing a screenshot in 120 words doesn't need Opus: Haiku costs ten times less.
const MODEL = process.env.VISION_MODEL || "anthropic/claude-haiku-4.5";
const CAPTURE_TIMEOUT_MS = 45_000;

// Domains where the screenshot adds nothing (login walls, video, social)
const SKIP = ["youtube.com", "youtu.be", "vimeo.com", "x.com", "twitter.com", "instagram.com", "linkedin.com", "primevideo.com", "netflix.com"];

export const visionEnabled = llmEnabled;

const SYSTEM = `You describe website screenshots for a design-taste classifier that can only read text.

Write ONE compact paragraph in English, 90-140 words, plain prose, no headings or lists. Cover, in this order:
1. Color scheme: dark or light background, dominant colors, whether the palette is monochrome, muted or bold/saturated.
2. Typography: is type the hero (very large display text)? Serif, sans, mono, custom/expressive? Approximate hierarchy.
3. Imagery: large photography, illustration, 3D renders, video stills, abstract/generative graphics, or none.
4. Layout: grid/bento, editorial columns, full-bleed hero, dense or airy, amount of whitespace.
5. Overall style in two or three descriptors (e.g. "minimal", "brutalist", "playful", "corporate", "editorial", "immersive", "retro").
Describe only what is visible. Do not guess at animation. Do not name the brand's business unless it is obvious from the screenshot.`;

export interface VisionResult { text: string; model: string; inputTokens: number; outputTokens: number; cacheReadTokens: number; costUsd: number | null; provider: string | null; requestId: string | null }

export async function describeScreenshot(jpeg: Buffer, ctx: { name: string; url: string }): Promise<VisionResult | null> {
  const res = await llm({
    model: MODEL,
    system: SYSTEM,
    image: jpeg,
    text: `Site: ${ctx.name} (${ctx.url}). Describe the screenshot.`,
    maxTokens: 600,
  });
  const text = res.text.trim();
  if (!text) return null;
  return { text, model: res.model, inputTokens: res.usage.input, outputTokens: res.usage.output, cacheReadTokens: res.usage.cacheRead, costUsd: res.costUsd, provider: res.provider, requestId: res.id };
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}

/** Captures (or reuses) the screenshot and describes it. Returns null if not applicable or on failure. */
export async function describeSite(item: { name: string; web: string }): Promise<VisionResult | null> {
  if (!visionEnabled()) return null;
  let host = "";
  try { host = new URL(item.web).hostname.replace(/^www\./, ""); } catch { return null; }
  if (SKIP.some((d) => host === d || host.endsWith(`.${d}`))) return null;

  try {
    const jpeg = await withTimeout(getOrCaptureShot(item.web), CAPTURE_TIMEOUT_MS, "capture");
    return await describeScreenshot(jpeg, { name: item.name, url: item.web });
  } catch (e) {
    console.warn("vision: skipped", item.web, e instanceof Error ? e.message : e);
    return null;
  }
}
