import type { DesignTokens } from "./design-extract";
import { DesignSpecSchema, renderDesignMd, type DesignSpec } from "@/types/design";
import { getErrors } from "./i18n";
import { llm, LlmError } from "./llm";

export const DESIGN_MD_MODEL = process.env.DESIGN_MD_MODEL || "deepseek/deepseek-v4.1-flash";

export const SYSTEM = `You extract the design system of a real website and turn it into a structured spec, in the style of styles.refero.design.

You receive (1) a JSON of design tokens measured on the live page (computed styles counted by frequency; background colors weighted by visible area) and (2) a viewport screenshot. The JSON is the truth for values. The screenshot is for judgment: hierarchy, atmosphere, density, what the brand is really doing. If they disagree, trust the JSON for numbers and the screenshot for intent.

The screenshot shows only the first 900px; the tokens cover the whole page. A color with a large background area is a section surface even if the screenshot does not show it. Never claim a color appears "only" somewhere based on the screenshot alone.

Rules:
- Write EVERYTHING in English.
- Concrete values: hex, px, font names, weights. Convert rgb()/rgba() to hex (8-digit hex when alpha matters).
- Ignore noise: browser defaults, cookie banners, third-party widgets, one-off values with count 1 unless clearly intentional.
- Name colors evocatively and consistently ("Obsidian", "Signal Blue", "Paper White"). Give each color a real role, not just "used on buttons".
- Contained palette. The token JSON already merges near-identical shades; do not split them again. If two colors would share a role, keep one. Most sites resolve with 6-10 tokens; a sober monochrome site may need only 5 or 6. Never more than 12.
- Every list entry must be distinct. Never repeat a color, font, scale step, rule or brand.
- Describe the roles each font plays and the signature decision that makes it recognisable (e.g. "weight 510 does all the work, nothing is bold").
- The tagline is a poetic but precise atmosphere descriptor, 3 to 6 words, lowercase: "matte editorial portfolio", "frosted instrument panel at midnight".
- The description is one dense paragraph, 120 to 180 words, that a designer would recognise as this exact site.
- The dos and don'ts must be specific to this system and reproducible by an AI agent.
- Type scale roles: caption, body-sm, body, subtitle, title-sm, title, title-lg, display.
- Components: 3 to 5 reusable primitives (primary button, secondary button, input, link, card, header, footer), only those that really exist. Never describe page sections (hero, image mosaic, logo carousel, feature rows): that is this landing's content, not the system. In each primitive cite tokens by name ("Obsidian background, small radius, body-sm text") and add only what is not in another section: height, padding, border, hover, active state.
- Round px that come from rem: 11.7px is 12px, 21.06px is 21px, 115.2px is 115px or the nearest scale step. A conversion decimal is not a design decision.
- Values must be CSS-ready: ASCII "-" for negatives (never "−"), line heights in the type scale as unitless ratios (1.5, not 27), and each type scale family written exactly as in the fonts list.
- If a value is doubtful, say so briefly in the role text instead of inventing it.`;

/** Mechanical slips any model can make, fixed here so they never reach an agent's CSS. */
export function normalizeSpec(spec: DesignSpec): DesignSpec {
  const families = spec.fonts.map((f) => f.family);
  return {
    ...spec,
    // ponytail: name-based guess; a proportional face marked mono becomes body
    fonts: spec.fonts.map((f) => (f.role === "mono" && !/mono|code|courier|consol|jet ?brains|menlo|monaco/i.test(f.family) ? { ...f, role: "body" } : f)),
    typeScale: spec.typeScale.map((t) => ({
      ...t,
      // ponytail: >4 can only be px; a ratio above 4 does not exist in real type
      lineHeight: t.lineHeight > 4 ? Math.round((t.lineHeight / t.size) * 100) / 100 : t.lineHeight,
      family: families.find((f) => f.toLowerCase() === t.family.toLowerCase())
        ?? families.find((f) => t.family.toLowerCase().includes(f.toLowerCase()) || f.toLowerCase().includes(t.family.toLowerCase()))
        ?? t.family,
    })),
  };
}

export interface GenerateResult {
  spec: DesignSpec;
  markdown: string;
  model: string;
  provider: string | null;
  costUsd: number | null;
  ms: number;
  usage: { input: number; output: number; cacheRead: number; reasoning: number };
}

export async function generateDesignMd(
  tokens: DesignTokens, screenshot: Buffer, signal?: AbortSignal, model = DESIGN_MD_MODEL,
): Promise<GenerateResult> {
  const date = new Date().toISOString().slice(0, 10);

  let res: Awaited<ReturnType<typeof llm>>;
  try {
    res = await llm({
      model,
      system: SYSTEM,
      image: screenshot,
      text: `Source URL: ${tokens.finalUrl}\nDate: ${date}\n\nMeasured tokens (JSON):\n${JSON.stringify(tokens)}`,
      schema: DesignSpecSchema,
      // Trap 2 (#5): reasoning eats the budget on long answers, so leave plenty of room
      maxTokens: 32000,
      effort: (process.env.DESIGN_MD_EFFORT as "low" | "medium" | "high") || "medium",
      signal,
    });
  } catch (err) {
    if (signal?.aborted || !(err instanceof LlmError) || !err.finishReason) throw err;
    throw new Error(`${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }

  // U+2212 looks like a minus and breaks CSS when an agent pastes it
  const spec = normalizeSpec(DesignSpecSchema.parse(JSON.parse(res.text.replace(/\u2212/g, "-"))));
  return {
    spec,
    markdown: renderDesignMd(spec, tokens.finalUrl, date),
    model: res.model,
    provider: res.provider,
    costUsd: res.costUsd,
    ms: res.ms,
    usage: res.usage,
  };
}
