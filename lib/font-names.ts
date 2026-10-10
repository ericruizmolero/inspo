// Names of typefaces, as sites and sheets write them. Pure: the server matches the files it finds
// against a sheet's families with this, and the type tester groups and labels its rows with it.

const STYLE_WORD = /\s(?:hairline|thin|extra ?light|ultra ?light|light|regular|normal|book|roman|medium|semi ?bold|demi ?bold|demi|bold|extra ?bold|ultra ?bold|black|heavy|italic|oblique|variable|var|vf)$/i;

/** The name as a person would write it: no next/font wrapping, the parts of a one-word name split at its capitals */
function clean(name: string): string {
  const s = name.replace(/^_+/, "").replace(/_[0-9a-f]{5,}$/i, "").replace(/[_-]+/g, " ").replace(/\s+fallback$/i, "").replace(/\s+/g, " ").trim();
  return /\s/.test(s) ? s : s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^[a-z]/, (c) => c.toUpperCase());
}

/** The family without its wrapping: "__Inter_1a2b3c" → "Inter", "tiemposText" → "Tiempos Text", "PP Neue Montreal SemiBold" → "PP Neue Montreal" */
export function familyBase(name: string): string {
  let s = clean(name);
  for (let i = 0; i < 3; i++) {
    const next = s.replace(STYLE_WORD, "").trim();
    if (!next || next === s) break;
    s = next;
  }
  return s;
}

/** Two names of the same family give the same key: "Tiempos Text", "tiemposText", "__tiemposText_9f8e7d" */
export const familyKey = (name: string) => familyBase(name).toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Icon and widget fonts are not the typography of a site */
export const NOT_TYPE = /icon|awesome|glyph|material symbols|material icons|swiper|slick|video-?js|katex|dashicons|icomoon|fontello|feather|remixicon|bootstrap-icons|lucide|emoji|webflow-icons|wf-icons|revicons|eicons|flexslider|photoswipe|plyr/i;
const SYSTEM_STACK = /^(-apple-system|blinkmacsystemfont|segoe ui|ui-|system-ui|sans-serif|serif|monospace|inherit|initial|var\()/i;
/** What a CSS minifier or a font loader leaves where a name should be: "Ff(", "4d688c08a8903c63", "Google Symbols Subset Tofu" */
const NOT_A_NAME = /[^\p{L}\p{N} .'&-]|\b[0-9a-f]{8,}\b|symbols|subset|tofu|fallback/iu;

/** The families a page's CSS names, as typefaces: each once, by its base name, without icon fonts or the system stack */
export function typeFamilies(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((n) => !SYSTEM_STACK.test(n.trim())).map((n) => familyBase(n)).filter((f) => {
    const k = familyKey(f);
    if (!k || seen.has(k) || NOT_TYPE.test(f) || NOT_A_NAME.test(f)) return false;
    seen.add(k);
    return true;
  });
}

const WEIGHT_WORD: [RegExp, number][] = [
  [/hairline|thin/i, 100], [/extra ?light|ultra ?light/i, 200], [/semi ?bold|demi ?bold|demi/i, 600], [/extra ?bold|ultra ?bold/i, 800],
  [/light/i, 300], [/medium/i, 500], [/black|heavy/i, 900], [/bold/i, 700],
];
/** Sites that declare one family per weight ("Kalice Bold") often leave font-weight at normal: the name says it */
export function weightInName(name: string): number | null {
  const tail = clean(name).slice(familyBase(name).length);
  for (const [re, w] of WEIGHT_WORD) if (re.test(tail)) return w;
  return null;
}

const SERIF = /serif|kalice|louize|tiempos|canela|garamond|times|georgia|playfair|editorial|freight|caslon|baskerville|didot|bodoni|minion|literata|lora|merriweather|spectral|fraunces|newsreader|reckless|ogg|roslindale|signifier|domaine|gt sectra|gt alpina|sabon|cardo|cormorant/i;
const MONO = /mono|courier|menlo|jetbrains|fira code|source code|consolas/i;
/** What stands in for a family while (or when) its file is not there */
export const genericOf = (family: string) => (MONO.test(family) ? "ui-monospace, monospace" : SERIF.test(family) && !/sans/i.test(family) ? "Georgia, 'Times New Roman', serif" : "'Inter', system-ui, sans-serif");
export const fontStack = (family: string) => `"${family}", ${genericOf(family)}`;
