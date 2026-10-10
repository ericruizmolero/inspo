import type { DesignTokens } from "./design-extract";
import { GeneratedSpecSchema, stripDashes, renderDesignMd, type DesignSpec } from "@/types/design";
import { getErrors } from "./i18n";
import { llm, LlmError } from "./llm";
import { HttpError } from "./workspace-core";

export const DESIGN_MD_MODEL = process.env.DESIGN_MD_MODEL || "deepseek/deepseek-v4.1-flash";

export const SYSTEM = `You extract the design system of a real website and turn it into a structured spec, in the style of styles.refero.design.

WHAT YOU GET
- A JSON of design tokens measured on the live page: computed styles counted by frequency, background colors weighted by visible area. It is the truth for values.
- A viewport screenshot. It is for judgment: hierarchy, atmosphere, density, what the brand is really doing.
- When they disagree, trust the JSON for numbers and the screenshot for intent.
- The screenshot shows only the first 900px; the tokens cover the whole page. A color with a large background area is a section surface even if the screenshot does not show it. Never claim a color appears "only" somewhere from the screenshot alone.

LANGUAGE
Write everything in English, except "es": the tagline and the brief again in Castilian Spanish (Spain), for the Spanish sheet. Each Spanish line is as short as its English one or shorter, with the same rules.

VALUES
- Concrete values: hex, px, font names, weights. Convert rgb()/rgba() to hex (8-digit hex when alpha matters).
- CSS-ready: ASCII "-" for negatives (never "−"), line heights in the type scale as unitless ratios (1.5, not 27), and each type scale family written exactly as in the fonts list.
- Round px that come from rem: 11.7px is 12px, 21.06px is 21px, 115.2px is 115px or the nearest scale step. A conversion decimal is not a design decision.
- Ignore noise: browser defaults, cookie banners, third-party widgets, one-off values with count 1 unless clearly intentional.
- If a value is doubtful, say so briefly in the role text instead of inventing it.

COLORS
- Name them evocatively and consistently ("Obsidian", "Signal Blue", "Paper White"), and give each a real role, not just "used on buttons".
- A contained palette. The token JSON already merges near-identical shades: do not split them again. If two colors would share a role, keep one. Most sites resolve with 6 to 10 tokens; a sober monochrome site may need 5 or 6. Never more than 12.

FONTS AND TYPE SCALE
- Describe the roles each font plays and the signature decision that makes it recognisable ("weight 510 does all the work, nothing is bold").
- Type scale roles: caption, body-sm, body, subtitle, title-sm, title, title-lg, display.

COMPONENTS
- 3 to 5 reusable primitives (primary button, secondary button, input, link, card, header, footer), only those that really exist.
- Never describe page sections (hero, image mosaic, logo carousel, feature rows): that is this landing's content, not the system.
- In each primitive, cite tokens by name ("Obsidian background, small radius, body-sm text") and add only what is not in another section: height, padding, border, hover, active state.

TEXT
- Every list entry is distinct. Never repeat a color, font, scale step, rule or brand.
- The tagline is a poetic but precise atmosphere descriptor, 3 to 6 words, lowercase: "matte editorial portfolio", "frosted instrument panel at midnight".
- The description is one dense paragraph, 120 to 180 words, that a designer would recognise as this exact site.
- The dos and don'ts are specific to this system and reproducible by an AI agent.

THE BRIEF
What a designer reads first, in a glance: look and feel, not inventory. Every value is ONE short sentence of 8 to 20 words (imagery may take two short ones, 30 words in all). Shorter is better. Never write counts ("180 icons", "28 images"), pixel sizes or hex values in it.
- typography: the families and the one decision that defines them.
- imagery: the look and feel of the pictures (kind, light, colour grading, crop, mood).
- logo: the look and feel of the logo, from tokens.logo and the screenshot (wordmark or symbol, how it is drawn, the character it gives).
- motion: how it feels, then the means: the library from tokens.stack if there is one, and only the dominant easing from tokens.motion, written literally ("Quick and switch-like: cubic-bezier(0.25, 0.46, 0.45, 0.94) at 0.1s").
- iconography: outline or filled, stroke weight, corners, geometric or hand-drawn, the library if detected.
- voice: register and person in a few words, then a short verbatim quote from tokens.copy.
- color: a few words on the palette's mood ("matte blacks with one lime signal").
- framework: only the names in tokens.stack, comma separated, nothing else; "Not detected" when it is empty.

PUNCTUATION
Never use em or en dashes (— –) or a double hyphen as punctuation, in any language: use a comma, a colon or a full stop. A range takes a hyphen (12-16px).`;

/** Mechanical slips any model can make, fixed here so they never reach an agent's CSS. */
export function normalizeSpec(input: DesignSpec): DesignSpec {
  const spec = stripDashes(input);
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
  requestId: string | null;
  costUsd: number | null;
  ms: number;
  usage: { input: number; output: number; cacheRead: number; reasoning: number };
  fallbackFrom: string | null;
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
      schema: GeneratedSpecSchema,
      // Trap 2 (#5): reasoning eats the budget on long answers, so leave plenty of room
      maxTokens: 32000,
      effort: (process.env.DESIGN_MD_EFFORT as "low" | "medium" | "high") || "medium",
      signal,
    });
  } catch (err) {
    if (signal?.aborted || !(err instanceof LlmError) || !err.finishReason) throw err;
    throw new HttpError(502, `${(await getErrors()).incompleteAnswer} (finish_reason=${err.finishReason})`);
  }

  // U+2212 looks like a minus and breaks CSS when an agent pastes it
  const spec = normalizeSpec(GeneratedSpecSchema.parse(JSON.parse(res.text.replace(/\u2212/g, "-"))));
  return {
    spec,
    markdown: renderDesignMd(spec, tokens.finalUrl, date),
    model: res.model,
    provider: res.provider,
    requestId: res.id,
    fallbackFrom: res.fallbackFrom,
    costUsd: res.costUsd,
    ms: res.ms,
    usage: res.usage,
  };
}
