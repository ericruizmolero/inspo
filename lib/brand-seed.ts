// A brand read straight from a site's DESIGN.md, with no model: its named palette, its families and their scale,
// its easing, its logo. This is how a project that already has a website starts with its brand on the page in
// seconds; the model's pass then reads it with everything else and improves what it can.
import "server-only";
import { keyOf } from "./storage";
import { resolveFace } from "./brand-fonts";
import { bezierOf, durationsIn, EASING_RE, luminance } from "./brand-values";
import { familyBase, familyKey } from "./font-names";
import { brandId, type BrandColor, type BrandFace, type BrandSections, type ScaleStep } from "@/types/brand";
import type { DesignMdEntry } from "./design-store";

/** The scale's roles in DESIGN.md, as a guideline names its steps */
const STEP_LABEL: Record<string, string> = {
  display: "Display", "title-lg": "H1", title: "H2", "title-sm": "H3", subtitle: "H4", body: "Body", "body-sm": "Small", caption: "Caption",
};

/** "-0.5px" at 32px → -0.016em; "-0.02em" → -0.02; "normal" → 0 */
function trackingEm(value: string, px: number): number {
  const v = value.trim().replace("−", "-");
  const m = v.match(/^(-?\d*\.?\d+)\s*(px|em|rem|%)?$/);
  if (!m) return 0;
  const n = Number(m[1]);
  const em = m[2] === "px" ? n / px : m[2] === "%" ? n / 100 : n;
  return Math.max(-0.2, Math.min(0.5, Math.round(em * 1000) / 1000));
}

/** The palette: how much of the brand each colour covers decides its tile (the page's ground the largest) */
function colorsOf(spec: NonNullable<DesignMdEntry["spec"]>): { items: BrandColor[]; accentId: string | null } {
  const dark = spec.theme === "dark";
  const neutrals = spec.colors.filter((c) => c.group === "neutral").sort((a, b) => luminance(a.hex.slice(0, 7)) - luminance(b.hex.slice(0, 7)));
  const ground = dark ? neutrals[0] : neutrals[neutrals.length - 1];
  const ink = dark ? neutrals[neutrals.length - 1] : neutrals[0];
  const items = spec.colors.filter((c) => /^#[0-9a-f]{6}/i.test(c.hex)).slice(0, 12).map((c): BrandColor => ({
    id: brandId(), name: c.name, hex: c.hex.slice(0, 7).toUpperCase(), role: c.role, group: c.group,
    weight: c === ground ? 4 : c === ink || c.group === "brand" ? 3 : c.group === "accent" ? 2 : 1,
  }));
  const accent = items.find((c) => c.group === "accent") ?? items.find((c) => c.group === "brand") ?? null;
  return { items, accentId: accent?.id ?? null };
}

async function typeOf(spec: NonNullable<DesignMdEntry["spec"]>, clientWeb: string): Promise<{ faces: BrandFace[]; scale: ScaleStep[] }> {
  // One face per family, the display first; ui and body both set text
  const seen = new Set<string>();
  const fams = [...spec.fonts].sort((a, b) => ["display", "body", "ui", "mono"].indexOf(a.role) - ["display", "body", "ui", "mono"].indexOf(b.role))
    .filter((f) => { const k = familyKey(f.family); if (!k || seen.has(k)) return false; seen.add(k); return true; }).slice(0, 3);
  const faces = await Promise.all(fams.map(async (f): Promise<BrandFace> => {
    const r = await resolveFace(f.family, f.weights.filter((w) => w >= 100 && w <= 1000), clientWeb).catch(() => null);
    return {
      id: brandId(), family: r?.family ?? familyBase(f.family), role: f.role === "display" ? "display" : f.role === "mono" ? "mono" : "text",
      source: r?.source ?? "system", weights: r?.weights ?? f.weights, ...(r?.slug ? { slug: r.slug } : {}), ...(r?.siteWeb ? { siteWeb: r.siteWeb } : {}),
      note: f.usage,
    };
  }));
  // With one family only, it sets both the headlines and the text
  if (faces.length === 1 && faces[0].role === "text") faces[0].role = "display";
  const faceOf = (family: string) => faces.find((x) => familyKey(x.family) === familyKey(family)) ?? faces[0];
  const scale = faces.length ? [...spec.typeScale].sort((a, b) => b.size - a.size).slice(0, 10).map((s): ScaleStep => ({
    id: brandId(), label: STEP_LABEL[s.role] ?? s.role, px: Math.max(6, Math.min(400, s.size)), faceId: faceOf(s.family).id,
    weight: Math.max(100, Math.min(1000, Math.round(s.weight / 100) * 100 || 400)), lineHeight: Math.max(0.6, Math.min(3, s.lineHeight || 1.4)),
    tracking: trackingEm(s.letterSpacing, s.size),
  })) : [];
  return { faces, scale };
}

function motionOf(spec: NonNullable<DesignMdEntry["spec"]>): BrandSections["motion"] | null {
  const text = `${spec.brief?.motion ?? ""} ${spec.motion}`;
  const curves = [...new Set(text.match(EASING_RE) ?? [])].map((css) => bezierOf(css)).filter((b): b is NonNullable<typeof b> => !!b)
    .filter((b, i, all) => all.findIndex((x) => x.join() === b.join()) === i).slice(0, 2)
    .map((bezier, i) => ({ id: brandId(), name: i === 0 ? "Standard" : "Secondary", bezier, use: "" }));
  const ms = durationsIn(text).sort((a, b) => a - b).slice(0, 3);
  if (!curves.length && !ms.length) return null;
  return {
    lede: spec.brief?.motion ?? "",
    curves,
    durations: ms.map((m, i) => ({ id: brandId(), name: ms.length === 1 ? "Base" : ["Fast", "Base", "Slow"][i] ?? `${m} ms`, ms: m, use: "" })),
    staggerMs: 40,
    rule: spec.motion,
  };
}

/** What a site's DESIGN.md says, as brand sections. The logo is the picture of it as it sits on the page */
export async function seedFromDesignMd(entry: DesignMdEntry, client: { web: string; name: string }): Promise<Partial<BrandSections>> {
  const spec = entry.spec;
  if (!spec) return {};
  const out: Partial<BrandSections> = {};
  const { items, accentId } = colorsOf(spec);
  if (items.length) out.color = { lede: spec.brief?.color ?? "", items, accentId };
  const type = await typeOf(spec, client.web);
  if (type.faces.length) out.typography = { lede: spec.brief?.typography ?? "", faces: type.faces, scale: type.scale, sample: "", trackingRule: "" };
  const motion = motionOf(spec);
  if (motion) out.motion = motion;
  const svgKey = entry.logoSvgUrl ? keyOf(entry.logoSvgUrl) : null;
  const pngKey = entry.logoUrl ? keyOf(entry.logoUrl) : null;
  const logoKey = svgKey ?? pngKey;
  if (logoKey) {
    const file = { key: logoKey, type: svgKey ? "image/svg+xml" : "image/png", name: `${spec.brand} logo` };
    out.logo = { lede: spec.brief?.logo ?? "", primary: spec.theme === "dark" ? { light: null, dark: file } : { light: file, dark: null }, mark: { light: null, dark: null }, clearSpace: 1, minPx: null };
  }
  if (spec.brief?.voice) out.voice = { lede: spec.brief.voice, principles: [], pairs: [] };
  if (spec.brief?.imagery) out.imagery = { lede: spec.brief.imagery, traits: [], avoid: [], itemIds: [], files: [] };
  let host = "";
  try { host = new URL(client.web).hostname.replace(/^www\./, ""); } catch { /* a text or an image has no host */ }
  out.applications = { lede: "", handle: (spec.brand || client.name).toLowerCase().replace(/[^a-z0-9._]/g, "").slice(0, 30), domain: host, tagline: spec.tagline, bio: "", postLine: "", heroItemId: null, heroFile: null };
  return out;
}
