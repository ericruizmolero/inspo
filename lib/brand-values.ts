// The brand's values, read and converted. Pure, shared by the presentation, criterio.md and the server: a colour
// in the codes a printer or a developer asks for, how far two colours stand apart, a curve from its CSS.

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) || 0) as Rgb;
}

export const rgbToHex = ([r, g, b]: Rgb) => `#${[r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`.toUpperCase();

export function rgbToHsl([r, g, b]: Rgb): [number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

export function rgbToCmyk([r, g, b]: Rgb): [number, number, number, number] {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const k = 1 - Math.max(R, G, B);
  if (k >= 1) return [0, 0, 0, 100];
  return [(1 - R - k) / (1 - k), (1 - G - k) / (1 - k), (1 - B - k) / (1 - k), k].map((v) => Math.round(v * 100)) as [number, number, number, number];
}

/** The codes of a colour, as a guideline prints them */
export function colorCodes(hex: string) {
  const rgb = hexToRgb(hex);
  return { hex: hex.toUpperCase(), rgb: rgb.join(", "), hsl: (() => { const [h, s, l] = rgbToHsl(rgb); return `${h}, ${s}%, ${l}%`; })(), cmyk: rgbToCmyk(rgb).join(", ") };
}

/** WCAG relative luminance, 0 (black) to 1 (white) */
export function luminance(hex: string): number {
  const ch = hexToRgb(hex).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Ink that reads on a colour: near black on light, near white on dark */
export const inkOn = (hex: string) => (luminance(hex) > 0.4 ? "#101216" : "#F5F6F7");

/** The colour, darkened (or lightened) step by step until it stands `min` apart from `bg` */
export function withContrast(hex: string, bg: string, min = 3): string {
  let rgb = hexToRgb(hex);
  const darker = luminance(bg) > 0.4;
  for (let i = 0; i < 20 && contrast(rgbToHex(rgb), bg) < min; i++) rgb = rgb.map((v) => (darker ? v * 0.88 : v + (255 - v) * 0.12)) as Rgb;
  return rgbToHex(rgb);
}

/** A colour in CIELAB (D65): distances there follow the eye, distances in RGB do not */
export function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const xyz = [(0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, 0.2126 * r + 0.7152 * g + 0.0722 * b, (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883];
  const [x, y, z] = xyz.map((t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116));
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/** CIE76 delta E: about 2.3 is the smallest difference an eye notices */
export function deltaE(a: string, b: string): number {
  const [p, q] = [hexToLab(a), hexToLab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

// Under 10 a colour reads as the measured one nudged (a tint step, a rounding, a cleaner neutral); past it a person
// sees another colour, so it did not come from what was measured
const MEASURED_DELTA = 10;

/** Whether a colour stands far from every measured one; with nothing measured, every colour does */
export const unmeasured = (hex: string, measured: string[]) => !measured.some((m) => deltaE(hex, m) <= MEASURED_DELTA);

/** Every hex written in a text, as #RRGGBB, each once */
export const hexesIn = (text: string) => [...new Set([...text.matchAll(/#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3})\b/gi)].map((m) => rgbToHex(hexToRgb(m[0]))))];

/** Whether a colour has hue (a brand colour) or is a grey, a near black or a near white */
export const hasHue = (hex: string) => { const [r, g, b] = hexToRgb(hex).map((v) => v / 255); return Math.max(r, g, b) - Math.min(r, g, b) > 0.18; };

// ─── Curves ──────────────────────────────────────────────────────────────────

export type Bezier = [number, number, number, number];
const KEYWORDS: Record<string, Bezier> = {
  linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], "ease-in": [0.42, 0, 1, 1], "ease-out": [0, 0, 0.58, 1], "ease-in-out": [0.42, 0, 0.58, 1],
};
export const EASING_RE = /cubic-bezier\(\s*[\d.]+\s*,\s*-?[\d.]+\s*,\s*[\d.]+\s*,\s*-?[\d.]+\s*\)|\b(ease-in-out|ease-out|ease-in|linear|ease)\b/g;

/** A CSS timing function as its four numbers; null when it is not one */
export function bezierOf(css: string): Bezier | null {
  const t = css.trim().toLowerCase();
  if (KEYWORDS[t]) return KEYWORDS[t];
  const m = t.match(/cubic-bezier\(\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*([\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
  if (!m) return null;
  return clampBezier([1, 2, 3, 4].map((i) => Number(m[i])) as Bezier);
}

/** x stays inside 0..1 (CSS refuses it otherwise); y may overshoot, within reason */
export const clampBezier = ([a, b, c, d]: Bezier): Bezier => [Math.min(1, Math.max(0, a)), Math.min(2, Math.max(-1, b)), Math.min(1, Math.max(0, c)), Math.min(2, Math.max(-1, d))].map((v) => Math.round(v * 1000) / 1000) as Bezier;

export const bezierCss = (b: Bezier) => `cubic-bezier(${b.join(", ")})`;

/** Durations named in a text, in ms: "300ms", "0.4s" */
export function durationsIn(text: string): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(/(\d*\.?\d+)\s*(ms|s)\b/g)) {
    const ms = m[2] === "s" ? Number(m[1]) * 1000 : Number(m[1]);
    if (ms > 0 && ms <= 5000 && !out.includes(Math.round(ms))) out.push(Math.round(ms));
  }
  return out;
}

// ─── Names ───────────────────────────────────────────────────────────────────

/** A token name for CSS: "Signal Blue" → "signal-blue" */
export const tokenName = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

/** A hex as a model may write it: with or without #, maybe with alpha after */
export const HEX_RE_LOOSE = /^#?[0-9a-f]{6}/i;
