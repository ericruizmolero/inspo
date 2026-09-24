import { z } from "zod";

// ─── Structured spec returned by the model ───────────────────────────────────

export const DesignSpecSchema = z.object({
  brand: z.string().describe("Brand or site name, short"),
  tagline: z.string().describe("Poetic descriptor of the visual atmosphere, 3-6 words, lowercase, e.g. 'white museum gallery at noon'"),
  theme: z.enum(["light", "dark"]),
  description: z.string().describe("One paragraph, 120-180 words: what the interface conveys and the concrete decisions that produce it. Mention hex values and font names in the text."),
  colors: z.array(z.object({
    name: z.string().describe("Evocative name of 1-2 words, e.g. 'Signal Blue', 'Obsidian'"),
    hex: z.string().describe("#rrggbb, or #rrggbbaa when alpha matters"),
    group: z.enum(["brand", "accent", "neutral", "semantic"]),
    role: z.string().describe("Where and why it is used, one sentence"),
  })).min(4).max(12).describe("6 to 10 colors in most systems; 12 only for truly rich palettes. A palette is a set of decisions, not a census: merge shades that differ by a few RGB points into one token, group low-opacity whites or blacks into a single 'hairline' or 'veil' token, and drop any color without a distinct role. Typical: background, 1-2 surfaces, text, muted text, border, 1-3 accents, and semantic colors only if they really exist. Neutrals ordered dark to light. No duplicates."),
  fonts: z.array(z.object({
    family: z.string(),
    role: z.enum(["display", "body", "mono", "ui"]).describe("mono only for monospaced families"),
    weights: z.array(z.number()),
    sizes: z.string().describe("Range and count, e.g. '21-96px · 8 values'"),
    lineHeight: z.string(),
    letterSpacing: z.string(),
    fallback: z.string().describe("Free or system fallback stack if the font is proprietary"),
    usage: z.string().describe("2-3 sentences: what it is used for and the signature decision"),
  })),
  typeScale: z.array(z.object({
    role: z.string().describe("caption | body-sm | body | subtitle | title-sm | title | title-lg | display"),
    size: z.number().describe("px"),
    weight: z.number(),
    lineHeight: z.number().describe("Unitless ratio such as 1.5, never px"),
    letterSpacing: z.string().describe("CSS value, e.g. '-0.5px' or 'normal'. ASCII hyphen for negatives"),
    family: z.string().describe("Exactly one of the fonts[].family names, nothing else"),
  })).describe("6-9 steps from smallest to largest"),
  spacing: z.object({
    density: z.enum(["compact", "comfortable", "airy"]),
    baseUnit: z.string(),
    maxWidth: z.string(),
    sectionGap: z.string(),
    cardPadding: z.string(),
    elementGap: z.string(),
  }),
  radii: z.array(z.object({ element: z.string(), value: z.string() })),
  elevation: z.string().describe("How depth is achieved: shadows, borders or surface steps. Include shadow values if any."),
  components: z.array(z.object({
    name: z.string().describe("Primitive name: 'Primary button', 'Secondary button', 'Input', 'Link', 'Card', 'Header', 'Footer'"),
    role: z.string().describe("What it does on this site, one short sentence"),
    spec: z.string().describe("Only what is not already in another section: height or padding, border, hover, active state. Cite tokens by name ('Obsidian background, small radius, body-sm text') instead of repeating hex, font and size. No rem conversion decimals."),
  })).describe("3 to 5 reusable primitives, the ones an agent needs so it does not invent a button. Only: primary button, secondary button, input, link, card, header, footer. Never page sections (hero, mosaic, carousel, 'capabilities row', 'trusted by'): that is content, not system."),
  motion: z.string().describe("Transitions, easing, durations, what animates and what does not."),
  layout: z.string().describe("Structure, container, grid, rhythm, alignment."),
  imagery: z.string().describe("Photography vs illustration, density, treatment."),
  dos: z.array(z.string()).describe("5-7 rules"),
  donts: z.array(z.string()).describe("5-7 rules"),
  similar: z.array(z.object({ brand: z.string(), why: z.string() })).describe("3-5 real brands with a similar system"),
  agentPrompt: z.string().describe("Paragraph of 60-100 words an AI agent can paste to reproduce the style"),
});

export type DesignSpec = z.infer<typeof DesignSpecSchema>;

// ─── Render to markdown (Refero-like format) ─────────────────────────────────

export function renderDesignMd(spec: DesignSpec, url: string, date: string): string {
  const L: string[] = [];
  const p = (s = "") => L.push(s);

  p(`# ${spec.brand} — DESIGN.md`);
  p(`> ${spec.tagline}`);
  p();
  p(`**Theme:** ${spec.theme}  `);
  p(`**Source:** ${url} · ${date}`);
  p();
  p("Source measurements are normalised; roles and recommendations are interpreted.");
  p();
  p(spec.description);
  p();

  p("## Colors");
  p();
  p("| Name | Value | Group | Role |");
  p("|------|-------|-------|------|");
  for (const c of spec.colors) p(`| ${c.name} | \`${c.hex}\` | ${c.group} | ${c.role} |`);
  p();

  p("## Typography");
  p();
  for (const f of spec.fonts) {
    p(`### ${f.family} — ${f.role}`);
    p(f.usage);
    p(`- **Fallback:** ${f.fallback}`);
    p(`- **Weights:** ${f.weights.join(", ")}`);
    p(`- **Sizes:** ${f.sizes}`);
    p(`- **Line height:** ${f.lineHeight}`);
    p(`- **Letter spacing:** ${f.letterSpacing}`);
    p();
  }
  p("### Type scale");
  p();
  p("| Role | Family | Weight | Size | Line height | Letter spacing |");
  p("|------|--------|--------|------|-------------|----------------|");
  for (const t of spec.typeScale) p(`| ${t.role} | ${t.family} | ${t.weight} | ${t.size}px | ${t.lineHeight} | ${t.letterSpacing} |`);
  p();

  p("## Spacing and layout");
  p();
  p(`**Density:** ${spec.spacing.density}`);
  p();
  p(`- **Base unit:** ${spec.spacing.baseUnit}`);
  p(`- **Max page width:** ${spec.spacing.maxWidth}`);
  p(`- **Section gap:** ${spec.spacing.sectionGap}`);
  p(`- **Card padding:** ${spec.spacing.cardPadding}`);
  p(`- **Element gap:** ${spec.spacing.elementGap}`);
  p();
  p("### Border radii");
  p();
  for (const r of spec.radii) p(`- **${r.element}:** ${r.value}`);
  p();
  p("## Elevation");
  p();
  p(spec.elevation);
  p();

  p("## Components");
  p();
  for (const c of spec.components) {
    p(`### ${c.name}`);
    p(`**Role:** ${c.role}`);
    p();
    p(c.spec);
    p();
  }

  p("## Motion");
  p();
  p(spec.motion);
  p();
  p("## Layout");
  p();
  p(spec.layout);
  p();
  p("## Imagery");
  p();
  p(spec.imagery);
  p();

  p("## Do and don't");
  p();
  p("### Do");
  for (const d of spec.dos) p(`- ${d}`);
  p();
  p("### Don't");
  for (const d of spec.donts) p(`- ${d}`);
  p();

  p("## Similar brands");
  p();
  for (const s of spec.similar) p(`- **${s.brand}** — ${s.why}`);
  p();

  p("## Agent prompt");
  p();
  p(spec.agentPrompt);
  p();

  return L.join("\n");
}

// ─── Why it's here (per workspace) ───────────────────────────────────────────
// The DESIGN.md says what the site is. This says why it is in this library: the words
// of whoever saved it and of the thread, connected by a model to what was measured.

export const WhyStatus = z.enum(["measured", "seen", "unverifiable"]);

export const WhyHighlightSchema = z.object({
  quote: z.string().describe("The person's words, verbatim and in their language, trimmed to the part that names what they liked (max 20 words)"),
  author: z.string().describe("Who said it"),
  status: WhyStatus.describe("measured: the spec has values for it. seen: visible in the screenshot but the spec has no numbers for it. unverifiable: not observable from styles or a still image (sound, hover, scroll, feel, speed)."),
  where: z.string().describe("The element or area of the page, 2-6 words, in the reader's language. Empty if it cannot be located."),
  values: z.array(z.string()).describe("Only measured or seen: the concrete values behind it, as short chips of 1-4 words each, e.g. 'Mono 11px caps', '#ffffff', 'radius 0', 'ease-out 180ms', 'weight 510'. Token names as the spec writes them. Empty when unverifiable."),
  note: z.string().describe("In the reader's language, max 25 words, only if it adds something the capture and the values do not already say: the one decision to get right, or for unverifiable things what would be needed to check them. Never what the spec lacks or fails to document. Empty when the capture says it all."),
  shots: z.array(z.string()).describe("Ids of the probe captures (from the PROBE REPORT captures list) that show exactly this thing. Empty if none shows it, or if there is no probe report."),
});

export const DesignWhySchema = z.object({
  highlights: z.array(WhyHighlightSchema).describe("One entry per distinct concrete thing the people pointed at, in the order they said it. A comment that repeats an earlier point merges into it. General remarks produce nothing. Never add things nobody mentioned."),
});

export type WhyHighlight = z.infer<typeof WhyHighlightSchema> & {
  /** URLs of the captures behind `shots` (private Blob in production, /public locally) */
  shotUrls?: string[];
};
export type DesignWhy = Omit<z.infer<typeof DesignWhySchema>, "highlights"> & {
  highlights: WhyHighlight[];
  model: string; createdAt: string; voices: number;
  /** What the headless browser went to check, when the notes mentioned something interactive */
  probe?: { summary: string[]; ms: number; captures?: number; hovered?: number; audioEvents?: number };
};

/** The section appended to the DESIGN.md of this workspace (the global file does not carry it). */
export function renderWhyMd(why: DesignWhy): string {
  if (!why.highlights.length) return "";
  const L: string[] = [];
  const p = (s = "") => L.push(s);
  p("## Why it's here");
  p();
  p("What the team pointed at, in their words, connected to the measured values.");
  p();
  if (why.probe?.summary.length) { p(`Browser probe: ${why.probe.summary.join(" · ")}`); p(); }
  for (const h of why.highlights) {
    p(`- "${h.quote}" — ${h.author}${h.where ? ` · ${h.where}` : ""} · ${h.status}`);
    if (h.values?.length) p(`  - Values: ${h.values.join(" · ")}`); // older rows may predate the chips
    p(`  - ${h.status === "unverifiable" ? "To verify" : "Get right"}: ${h.note}`);
    if (h.shotUrls?.length) p(`  - Captures: ${h.shotUrls.join(" · ")}`);
  }
  p();
  return L.join("\n");
}
