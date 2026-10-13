// The project's brand, as values: the colours, the faces and their scale, the curves, the logo files, the voice's
// pairs. The eight areas say in words what the project decided; this says it in values a page can be drawn with.
// The presentation (components/brand) draws it, criterio.md writes it as tables (lib/criterio-md.ts), a share
// link shows both. One source: what the team changes on the presentation is what the file says.
//
// Each section remembers where its values came from. A run of the model rewrites every section the team has not
// touched by hand (the site's and an imported guide's values too: the system stays alive); a section the team
// edited is theirs until they hand it back.
import { z } from "zod";

export const BRAND_SECTIONS = ["intro", "logo", "color", "typography", "imagery", "motion", "voice", "applications", "assets"] as const;
export type BrandSection = (typeof BRAND_SECTIONS)[number];

/** Who wrote a section last: the model, the team by hand, the client's site (measured), an imported guide or file */
export const BRAND_SRCS = ["model", "team", "site", "import"] as const;
export type BrandSrc = (typeof BRAND_SRCS)[number];
export interface SectionMeta { src: BrandSrc | null; by?: string | null; at?: string }

// ─── Limits ──────────────────────────────────────────────────────────────────

const TEXT = 600;
const LINE = 160;
const short = (max = LINE) => z.string().max(max).transform((s) => s.replace(/\r/g, "").trim());
const id = z.string().min(1).max(24).regex(/^[\w-]+$/).describe("A short id of your own: letters, digits, - or _.");
export const HEX_RE = /^#[0-9a-f]{6}$/i;

// ─── Files ───────────────────────────────────────────────────────────────────

/** A file the brand owns or points at, by its storage key (served at /api/files/<key>, or through a share) */
export const BrandFileSchema = z.object({
  // No "." or ".." segment: a prefix check on the key must mean the file really is under that prefix
  key: z.string().min(1).max(400).regex(/^inspo\/[\w./-]+$/).refine((k) => !k.split("/").some((p) => !p || p === "." || p === "..")),
  type: z.string().max(80),
  w: z.number().int().positive().max(20000).optional(),
  h: z.number().int().positive().max(20000).optional(),
  name: z.string().max(200).optional(),
});
export type BrandFile = z.infer<typeof BrandFileSchema>;

// ─── Sections ────────────────────────────────────────────────────────────────

export const IntroSchema = z.object({
  headline: short(200).describe("The brand in one line, as the presentation opens."),
  paragraphs: z.array(short(TEXT)).max(3).describe("Up to three short paragraphs under the headline."),
});

const LogoPair = z.object({ light: BrandFileSchema.nullable(), dark: BrandFileSchema.nullable() });
export const LogoSchema = z.object({
  lede: short(TEXT).describe("A sentence or two on the logo: what it is, how it is used."),
  primary: LogoPair.describe("The full logo, one file per ground it sits on."),
  mark: LogoPair.describe("The mark alone (the symbol, the monogram), one file per ground."),
  clearSpace: z.number().min(0).max(4).describe("Clear space around the logo, in x, where 1x is half the logo's height."),
  minPx: z.number().int().min(0).max(2000).nullable().describe("The smallest the logo is shown, in px; null when not set."),
});

export const COLOR_GROUPS = ["brand", "accent", "neutral", "semantic"] as const;
export const BrandColorSchema = z.object({
  id,
  name: short(40).describe("The colour's name as the team says it."),
  hex: z.string().regex(HEX_RE).transform((h) => h.toUpperCase()).describe("Six-digit hex, like #1A1A1A."),
  role: short(200).describe("What it is used for, in a line."),
  group: z.enum(COLOR_GROUPS).describe("brand (the colours that are the brand), accent (what calls attention), neutral (grounds, text, borders), semantic (success, warning, danger)."),
  weight: z.number().int().min(1).max(4).describe("How much of the brand it covers, 1 to 4: the tile's size on the presentation. The page's ground is 4, text 3, an accent 2, a rare one 1."),
  /** The model wrote it far from every measured hex (lib/brand.ts toSections); an edit by hand drops it */
  unmeasured: z.boolean().optional(),
});
export type BrandColor = z.infer<typeof BrandColorSchema>;
export const ColorSchema = z.object({
  lede: short(TEXT).describe("A sentence or two on the palette: how it is built, what carries it."),
  items: z.array(BrandColorSchema).max(16),
  accentId: id.nullable().describe("The id of the colour that marks things on the page (the active section, the 1x of the logo, Do); null for none."),
});

export const FONT_SOURCES = ["google", "fontshare", "site", "upload", "system"] as const;
export type FontSource = (typeof FONT_SOURCES)[number];
export const FACE_ROLES = ["display", "text", "accent", "mono"] as const;
export const BrandFaceSchema = z.object({
  id,
  family: short(80).describe("The family's name, as its foundry writes it."),
  role: z.enum(FACE_ROLES).describe("display (headlines), text (reading), accent (a face used sparingly: a handwritten note, a quote, a label), mono (code, data)"),
  source: z.enum(FONT_SOURCES).describe("Where it loads from: google, fontshare (with slug), site (the site's own CSS, with siteWeb), upload, or system."),
  weights: z.array(z.number().int().min(100).max(1000)).max(9).describe("The weights in use, 100 to 1000."),
  slug: z.string().max(80).optional().describe('The Fontshare slug ("general-sans"), when the source is fontshare.'),
  siteWeb: z.string().max(400).optional().describe("The address of the site whose CSS serves it, when the source is site."),
  /** Uploaded files, one per weight and style */
  files: z.array(z.object({ weight: z.number().int().min(100).max(1000), style: z.enum(["normal", "italic"]), key: BrandFileSchema.shape.key })).max(12).optional(),
  note: short(TEXT).describe("What it is for, in a sentence."),
});
export type BrandFace = z.infer<typeof BrandFaceSchema>;
export const ScaleStepSchema = z.object({
  id,
  label: short(30).describe("The step's name: Display, H1, Body, Caption."),
  px: z.number().min(6).max(400).describe("Its size in px on desktop."),
  faceId: id.describe("The id of the face it is set in."),
  weight: z.number().int().min(100).max(1000).describe("The weight it is set in, 100 to 1000."),
  lineHeight: z.number().min(0.6).max(3).describe("Unitless, like 1.4."),
  tracking: z.number().min(-0.2).max(0.5).describe("Letter-spacing in em; negative tightens."),
});
export type ScaleStep = z.infer<typeof ScaleStepSchema>;
export const TypographySchema = z.object({
  lede: short(TEXT).describe("A sentence or two on the type: the pairing, what sets the tone."),
  faces: z.array(BrandFaceSchema).max(4),
  scale: z.array(ScaleStepSchema).max(14).describe("The type scale, largest first."),
  sample: short(120).describe("The line every step of the scale is set in."),
  trackingRule: short(TEXT).describe("How tracking and sizes behave, in a sentence or two."),
});

export const BrandCurveSchema = z.object({
  id,
  name: short(40).describe("The curve's name: Standard, Enter, Exit."),
  bezier: z.tuple([z.number().min(0).max(1), z.number().min(-1).max(2), z.number().min(0).max(1), z.number().min(-1).max(2)]).describe("The cubic-bezier as four numbers, like [0.2, 0, 0, 1]."),
  use: short(200).describe("What moves with it."),
});
export type BrandCurve = z.infer<typeof BrandCurveSchema>;
export const BrandDurationSchema = z.object({ id, name: short(40).describe("Fast, Base, Slow."), ms: z.number().int().min(0).max(5000).describe("In milliseconds."), use: short(200).describe("What takes this long.") });
export type BrandDuration = z.infer<typeof BrandDurationSchema>;
export const MOTION_DEMOS = ["enter", "move", "exchange", "carousel", "toggle", "reveal"] as const;
export type MotionDemo = (typeof MOTION_DEMOS)[number];
export const MotionSchema = z.object({
  lede: short(TEXT).describe("A sentence or two on how things move."),
  curves: z.array(BrandCurveSchema).max(4),
  durations: z.array(BrandDurationSchema).max(5),
  staggerMs: z.number().int().min(0).max(1000).describe("The delay between items that enter one after another, in milliseconds."),
  rule: short(1200).describe("The rules in prose: how it accelerates, what never moves."),
});

export const VoicePrincipleSchema = z.object({ id, title: short(80).describe("The principle in a few words."), body: short(300).describe("What it means in practice."), sample: short(200).describe("A line that shows it.") });
export const VoicePairSchema = z.object({ id, context: short(60).describe("Where it applies: an error, a button, an empty screen."), do: short(200).describe("The line as the brand writes it."), dont: short(200).describe("The same line as it never writes it.") });
export const VoiceSchema = z.object({
  lede: short(TEXT).describe("A sentence or two on how the brand sounds."),
  principles: z.array(VoicePrincipleSchema).max(6),
  pairs: z.array(VoicePairSchema).max(8),
});

/** How the brand's pictures look, said as traits (light, colour, crop, subjects), what they never do, and a few
 *  examples: the board is the moodboard, this is the rule it adds up to */
export const ImageryTraitSchema = z.object({ id, label: short(40).describe("The trait: Light, Colour, Crop, Subjects."), value: short(300).describe("What the pictures do about it.") });
export const ImagerySchema = z.object({
  lede: short(TEXT).describe("A sentence or two on the pictures."),
  traits: z.array(ImageryTraitSchema).max(8),
  avoid: z.array(short(200)).max(8).describe("What the pictures never do, one line each."),
  itemIds: z.array(z.string().max(40)).max(9).describe("Ids of the project's references that show it best, in order (from list_references)."),
  /** Pictures uploaded as examples */
  files: z.array(BrandFileSchema).max(9),
});
export type ImageryTrait = z.infer<typeof ImageryTraitSchema>;

export const ApplicationsSchema = z.object({
  lede: short(TEXT).describe("A sentence or two on where the brand shows up."),
  handle: z.string().max(30).transform((s) => s.replace(/^@/, "").replace(/[^\w.]/g, "")).describe("The handle on social profiles, without @."),
  domain: short(80).describe("The site's address as the browser tab shows it, like acme.com."),
  tagline: short(120).describe("The line under the name."),
  bio: short(200).describe("The profile's bio."),
  postLine: short(120).describe("The line set on the post and the story."),
  heroItemId: z.string().max(40).nullable().describe("The id of the reference behind the story and the profile's banner, or null."),
  /** The same picture as a file, when uploaded */
  heroFile: BrandFileSchema.nullable(),
});

export const AssetsSchema = z.object({
  lede: short(TEXT),
  /** Other brand files to hand out (a guide in PDF, a press kit) */
  files: z.array(BrandFileSchema).max(20),
  /** Whether uploaded font files go in the download */
  includeFonts: z.boolean(),
});

export const SECTION_SCHEMAS = {
  intro: IntroSchema, logo: LogoSchema, color: ColorSchema, typography: TypographySchema, motion: MotionSchema,
  voice: VoiceSchema, imagery: ImagerySchema, applications: ApplicationsSchema, assets: AssetsSchema,
} as const satisfies Record<BrandSection, z.ZodType>;

export type BrandSections = { [K in BrandSection]: z.infer<(typeof SECTION_SCHEMAS)[K]> };

/** Where the brand was brought in from: a site measured, a guide pasted, files uploaded */
export interface BrandSource { kind: "site" | "text" | "files"; label: string; key?: string; itemId?: string; at: string; by: string }

export interface BrandSpec extends BrandSections {
  v: 1;
  meta: Partial<Record<BrandSection, SectionMeta>>;
  sources: BrandSource[];
  /** The model's last pass over the values. `version`: the brand prompt's (lib/prompts.ts), missing before versions */
  run: { at: string; model: string; version?: number } | null;
}

// ─── Empty ───────────────────────────────────────────────────────────────────

export function emptyBrand(): BrandSpec {
  return {
    v: 1,
    intro: { headline: "", paragraphs: [] },
    logo: { lede: "", primary: { light: null, dark: null }, mark: { light: null, dark: null }, clearSpace: 1, minPx: null },
    color: { lede: "", items: [], accentId: null },
    typography: { lede: "", faces: [], scale: [], sample: "", trackingRule: "" },
    motion: { lede: "", curves: [], durations: [], staggerMs: 40, rule: "" },
    voice: { lede: "", principles: [], pairs: [] },
    imagery: { lede: "", traits: [], avoid: [], itemIds: [], files: [] },
    applications: { lede: "", handle: "", domain: "", tagline: "", bio: "", postLine: "", heroItemId: null, heroFile: null },
    assets: { lede: "", files: [], includeFonts: false },
    meta: {},
    sources: [],
    run: null,
  };
}

/** A stored brand, whatever it missed, as a whole spec: sections that fail their schema come back empty */
export function readBrand(raw: unknown): BrandSpec {
  const base = emptyBrand();
  if (!raw || typeof raw !== "object") return base;
  const r = { ...(raw as Partial<BrandSpec>) };
  // Brands saved before Imagery took the moodboard's place keep its words and pictures
  const old = (raw as { moodboard?: { lede?: string; itemIds?: string[]; files?: BrandFile[] } }).moodboard;
  if (old && !r.imagery) r.imagery = { lede: old.lede ?? "", traits: [], avoid: [], itemIds: (old.itemIds ?? []).slice(0, 9), files: (old.files ?? []).slice(0, 9) };
  if (r.meta && "moodboard" in r.meta && !r.meta.imagery) r.meta = { ...r.meta, imagery: (r.meta as Record<string, SectionMeta>).moodboard };
  const out = { ...base, meta: r.meta ?? {}, sources: Array.isArray(r.sources) ? r.sources : [], run: r.run ?? null } as BrandSpec;
  for (const k of BRAND_SECTIONS) {
    const parsed = SECTION_SCHEMAS[k].safeParse({ ...base[k], ...(r[k] as object | undefined) });
    if (parsed.success) (out as unknown as Record<string, unknown>)[k] = parsed.data;
  }
  return out;
}

/** Whether a section says anything yet: an empty one is hidden on a share and asks to be filled in the app */
export function sectionFilled(spec: BrandSpec, k: BrandSection, ctx?: { summary?: string; boardSize?: number }): boolean {
  switch (k) {
    case "intro": return !!(spec.intro.headline || spec.intro.paragraphs.length || ctx?.summary);
    case "logo": return !!(spec.logo.primary.light || spec.logo.primary.dark || spec.logo.mark.light || spec.logo.mark.dark);
    case "color": return spec.color.items.length > 0;
    case "typography": return spec.typography.faces.length > 0;
    case "motion": return spec.motion.curves.length > 0 || !!spec.motion.rule;
    case "voice": return spec.voice.principles.length > 0 || spec.voice.pairs.length > 0 || !!spec.voice.lede;
    case "imagery": return spec.imagery.traits.length + spec.imagery.itemIds.length + spec.imagery.files.length > 0 || !!spec.imagery.lede;
    case "applications": return spec.color.items.length > 0 || spec.typography.faces.length > 0;
    case "assets": return true;
  }
}

/** Whether a run may write over a section: everything but what the team set by hand */
export const runMayWrite = (spec: BrandSpec, k: BrandSection) => spec.meta[k]?.src !== "team";

/** A short id for an item of a section, made on either side */
export const brandId = () => Math.random().toString(36).slice(2, 10);

/** The accent the page marks with, or the first brand colour, or none */
export function accentOf(spec: BrandSpec): BrandColor | null {
  const items = spec.color.items;
  return items.find((c) => c.id === spec.color.accentId) ?? items.find((c) => c.group === "accent") ?? items.find((c) => c.group === "brand") ?? null;
}
