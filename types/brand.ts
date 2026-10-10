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
const id = z.string().min(1).max(24).regex(/^[\w-]+$/);
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
  headline: short(200),
  paragraphs: z.array(short(TEXT)).max(3),
});

const LogoPair = z.object({ light: BrandFileSchema.nullable(), dark: BrandFileSchema.nullable() });
export const LogoSchema = z.object({
  lede: short(TEXT),
  primary: LogoPair,
  mark: LogoPair,
  /** Clear space around the mark, in x; 1x = half the logo's height */
  clearSpace: z.number().min(0).max(4),
  /** The smallest the logo is shown, in px; null when not set */
  minPx: z.number().int().min(0).max(2000).nullable(),
});

export const COLOR_GROUPS = ["brand", "accent", "neutral", "semantic"] as const;
export const BrandColorSchema = z.object({
  id,
  name: short(40),
  hex: z.string().regex(HEX_RE).transform((h) => h.toUpperCase()),
  role: short(200),
  group: z.enum(COLOR_GROUPS),
  /** How much of the brand it covers, 1 to 4: the tile's size on the presentation */
  weight: z.number().int().min(1).max(4),
});
export type BrandColor = z.infer<typeof BrandColorSchema>;
export const ColorSchema = z.object({
  lede: short(TEXT),
  items: z.array(BrandColorSchema).max(16),
  /** The colour that marks things on the page (the active section, the 1x of the logo, Do) */
  accentId: id.nullable(),
});

export const FONT_SOURCES = ["google", "fontshare", "site", "upload", "system"] as const;
export type FontSource = (typeof FONT_SOURCES)[number];
export const FACE_ROLES = ["display", "text", "mono"] as const;
export const BrandFaceSchema = z.object({
  id,
  family: short(80),
  role: z.enum(FACE_ROLES),
  source: z.enum(FONT_SOURCES),
  weights: z.array(z.number().int().min(100).max(1000)).max(9),
  /** The Fontshare slug ("general-sans"), when it comes from there */
  slug: z.string().max(80).optional(),
  /** The reference whose CSS serves it, when the source is the site */
  siteWeb: z.string().max(400).optional(),
  /** Uploaded files, one per weight and style */
  files: z.array(z.object({ weight: z.number().int().min(100).max(1000), style: z.enum(["normal", "italic"]), key: BrandFileSchema.shape.key })).max(12).optional(),
  /** What it is for, in a sentence */
  note: short(TEXT),
});
export type BrandFace = z.infer<typeof BrandFaceSchema>;
export const ScaleStepSchema = z.object({
  id,
  label: short(30),
  px: z.number().min(6).max(400),
  faceId: id,
  weight: z.number().int().min(100).max(1000),
  lineHeight: z.number().min(0.6).max(3),
  /** em; negative tightens */
  tracking: z.number().min(-0.2).max(0.5),
});
export type ScaleStep = z.infer<typeof ScaleStepSchema>;
export const TypographySchema = z.object({
  lede: short(TEXT),
  faces: z.array(BrandFaceSchema).max(4),
  scale: z.array(ScaleStepSchema).max(14),
  /** The line every step of the scale is set in */
  sample: short(120),
  /** How tracking and sizes behave, in a sentence or two */
  trackingRule: short(TEXT),
});

export const BrandCurveSchema = z.object({
  id,
  name: short(40),
  bezier: z.tuple([z.number().min(0).max(1), z.number().min(-1).max(2), z.number().min(0).max(1), z.number().min(-1).max(2)]),
  use: short(200),
});
export type BrandCurve = z.infer<typeof BrandCurveSchema>;
export const BrandDurationSchema = z.object({ id, name: short(40), ms: z.number().int().min(0).max(5000), use: short(200) });
export type BrandDuration = z.infer<typeof BrandDurationSchema>;
export const MOTION_DEMOS = ["enter", "move", "exchange", "carousel", "toggle", "reveal"] as const;
export type MotionDemo = (typeof MOTION_DEMOS)[number];
export const MotionSchema = z.object({
  lede: short(TEXT),
  curves: z.array(BrandCurveSchema).max(4),
  durations: z.array(BrandDurationSchema).max(5),
  staggerMs: z.number().int().min(0).max(1000),
  /** The rules in prose: how it accelerates, what never moves */
  rule: short(1200),
});

export const VoicePrincipleSchema = z.object({ id, title: short(80), body: short(300), sample: short(200) });
export const VoicePairSchema = z.object({ id, context: short(60), do: short(200), dont: short(200) });
export const VoiceSchema = z.object({
  lede: short(TEXT),
  principles: z.array(VoicePrincipleSchema).max(6),
  pairs: z.array(VoicePairSchema).max(8),
});

/** How the brand's pictures look, said as traits (light, colour, crop, subjects), what they never do, and a few
 *  examples: the board is the moodboard, this is the rule it adds up to */
export const ImageryTraitSchema = z.object({ id, label: short(40), value: short(300) });
export const ImagerySchema = z.object({
  lede: short(TEXT),
  traits: z.array(ImageryTraitSchema).max(8),
  /** What the pictures never do, one line each */
  avoid: z.array(short(200)).max(8),
  /** References of the project that show it best, in order */
  itemIds: z.array(z.string().max(40)).max(9),
  /** Pictures uploaded as examples */
  files: z.array(BrandFileSchema).max(9),
});
export type ImageryTrait = z.infer<typeof ImageryTraitSchema>;

export const ApplicationsSchema = z.object({
  lede: short(TEXT),
  /** The handle on social profiles, without @ */
  handle: z.string().max(30).transform((s) => s.replace(/^@/, "").replace(/[^\w.]/g, "")),
  /** The site's address shown in the browser tab */
  domain: short(80),
  tagline: short(120),
  bio: short(200),
  /** The line set on the post and the story */
  postLine: short(120),
  /** The picture behind the story and the profile's banner: a reference or a file */
  heroItemId: z.string().max(40).nullable(),
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
