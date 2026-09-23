import puppeteer, { type Browser } from "puppeteer-core";
import fs from "fs";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface Tally { value: string; count: number }

export interface ElementSample {
  tag: string;
  text: string;
  color: string;
  background: string;
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  lineHeight: string;
  letterSpacing: string;
  textTransform: string;
  borderRadius: string;
  border: string;
  boxShadow: string;
  padding: string;
}

export interface DesignTokens {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  themeColor: string | null;
  lang: string;
  viewport: { width: number; height: number; pageHeight: number };
  body: {
    background: string;
    color: string;
    fontFamily: string;
    fontSize: string;
    lineHeight: string;
  };
  fonts: { loaded: string[]; families: Tally[]; links: string[] };
  colors: {
    backgrounds: Tally[]; // ponderado por área visible
    text: Tally[];
    borders: Tally[];
    accents: Tally[]; // colores de botones / enlaces
  };
  typography: {
    sizes: Tally[];
    weights: Tally[];
    lineHeights: Tally[];
    letterSpacings: Tally[];
    headings: ElementSample[];
    paragraphs: ElementSample[];
  };
  spacing: {
    paddings: Tally[];
    gaps: Tally[];
    margins: Tally[];
    maxWidths: Tally[];
  };
  radii: Tally[];
  shadows: Tally[];
  cssVariables: Record<string, string>;
  components: {
    buttons: ElementSample[];
    inputs: ElementSample[];
    links: ElementSample[];
    cards: ElementSample[];
  };
  motion: { transitions: Tally[]; hasScrollAnimations: boolean };
  stats: { elementsScanned: number; imagesCount: number; hasVideo: boolean };
}

export interface ExtractResult {
  tokens: DesignTokens;
  screenshot: Buffer; // jpeg del viewport a 1440px (para Claude)
  fullShot: Buffer;   // jpeg de la página entera a 1440px, hasta 6000px (para la ficha)
  cover: Buffer;      // jpeg 720x450 (portada del grid, ~25KB)
  scroll: Buffer;     // jpeg 720px de ancho, hasta 2250px (tira que se desplaza al hover, ~100KB)
}

// ─── Browser ─────────────────────────────────────────────────────────────────

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function launch(): Promise<Browser> {
  const local = process.env.CHROME_PATH || (process.platform === "darwin" && fs.existsSync(MAC_CHROME) ? MAC_CHROME : null);

  if (local && !process.env.VERCEL) {
    return puppeteer.launch({
      executablePath: local,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
    });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, "--hide-scrollbars"],
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
  });
}

// ─── Script que corre dentro de la página ────────────────────────────────────
// Va como string para que Next no lo transforme y puppeteer lo ejecute tal cual.

const COLLECT = `(() => {
  const MAX = 4000;
  const tally = (m, k, w = 1) => { if (!k) return; m.set(k, (m.get(k) || 0) + w); };
  const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count: Math.round(count) }));

  // Agrupa colores casi idénticos (p. ej. #08090a y #090a0b) en uno solo, sumando pesos.
  // Los rgba muy transparentes (<10%) son hairlines/hover: se funden en una entrada por tono.
  const parseRgb = (c) => { const m = c.match(/rgba?\\(\\s*(\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
  const topColors = (m, n = 12) => {
    const entries = [...m.entries()].sort((a, b) => b[1] - a[1]);
    const clusters = [];
    for (const [value, count] of entries) {
      const rgb = parseRgb(value);
      if (!rgb) { clusters.push({ value, count }); continue; }
      const hit = clusters.find((c) => c.rgb && Math.abs(c.rgb[3] - rgb[3]) < 0.08 &&
        Math.hypot(c.rgb[0] - rgb[0], c.rgb[1] - rgb[1], c.rgb[2] - rgb[2]) <= (rgb[3] < 0.1 ? 60 : 7));
      if (hit) hit.count += count; else clusters.push({ value, count, rgb });
    }
    return clusters.sort((a, b) => b.count - a.count).slice(0, n).map(({ value, count }) => ({ value, count: Math.round(count) }));
  };
  const isTransparent = (c) => !c || c === "transparent" || /rgba\\(\\s*\\d+,\\s*\\d+,\\s*\\d+,\\s*0\\)/.test(c);
  const cleanFont = (f) => (f || "").split(",")[0].replace(/["']/g, "").trim();

  const bg = new Map(), tx = new Map(), bd = new Map(), ac = new Map();
  const fam = new Map(), sz = new Map(), wt = new Map(), lh = new Map(), ls = new Map();
  const pad = new Map(), gap = new Map(), mar = new Map(), mw = new Map();
  const rad = new Map(), sh = new Map(), tr = new Map();

  const sample = (el, cs) => ({
    tag: el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).slice(0, 2).join(".") : ""),
    text: (el.innerText || el.value || el.placeholder || "").trim().slice(0, 60),
    color: cs.color, background: cs.backgroundColor, fontFamily: cleanFont(cs.fontFamily),
    fontSize: cs.fontSize, fontWeight: cs.fontWeight, lineHeight: cs.lineHeight,
    letterSpacing: cs.letterSpacing, textTransform: cs.textTransform,
    borderRadius: cs.borderRadius, border: cs.borderTopWidth + " " + cs.borderTopStyle + " " + cs.borderTopColor,
    boxShadow: cs.boxShadow, padding: cs.padding,
  });

  const headings = [], paragraphs = [], buttons = [], inputs = [], links = [], cards = [];
  const seenBtn = new Set(), seenLink = new Set();

  const all = document.querySelectorAll("body *");
  let scanned = 0;
  for (const el of all) {
    if (scanned >= MAX) break;
    if (["SCRIPT","STYLE","NOSCRIPT","SVG","PATH","META","LINK"].includes(el.tagName)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) continue;
    scanned++;
    const area = Math.min(r.width * r.height, 1440 * 900);

    if (!isTransparent(cs.backgroundColor)) tally(bg, cs.backgroundColor, area / 1000);
    const hasText = el.childNodes && [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (hasText) {
      tally(tx, cs.color);
      tally(fam, cleanFont(cs.fontFamily));
      tally(sz, cs.fontSize); tally(wt, cs.fontWeight); tally(lh, cs.lineHeight); tally(ls, cs.letterSpacing);
    }
    if (cs.borderTopStyle !== "none" && parseFloat(cs.borderTopWidth) > 0 && !isTransparent(cs.borderTopColor)) tally(bd, cs.borderTopColor);
    if (cs.borderRadius && cs.borderRadius !== "0px") tally(rad, cs.borderRadius);
    if (cs.boxShadow && cs.boxShadow !== "none") tally(sh, cs.boxShadow);
    if (cs.padding && cs.padding !== "0px") tally(pad, cs.padding);
    if (cs.gap && cs.gap !== "normal" && cs.gap !== "0px") tally(gap, cs.gap);
    if (cs.marginTop !== "0px" || cs.marginBottom !== "0px") tally(mar, cs.marginTop + " / " + cs.marginBottom);
    if (cs.maxWidth && cs.maxWidth !== "none" && r.width > 600) tally(mw, cs.maxWidth);
    if (cs.transitionDuration && cs.transitionDuration !== "0s") tally(tr, cs.transitionProperty.split(",")[0].trim() + " " + cs.transitionDuration.split(",")[0].trim() + " " + cs.transitionTimingFunction.split(",")[0].trim());

    const tag = el.tagName;
    if (/^H[1-3]$/.test(tag) && headings.length < 8) headings.push(sample(el, cs));
    else if (tag === "P" && hasText && paragraphs.length < 4 && r.width > 200) paragraphs.push(sample(el, cs));
    else if ((tag === "BUTTON" || el.getAttribute("role") === "button" || (tag === "A" && /btn|button|cta/i.test(el.className || ""))) && buttons.length < 8) {
      const key = cs.backgroundColor + cs.color + cs.borderRadius;
      if (!seenBtn.has(key)) { seenBtn.add(key); buttons.push(sample(el, cs)); if (!isTransparent(cs.backgroundColor)) tally(ac, cs.backgroundColor, 3); }
    }
    else if ((tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") && inputs.length < 4) inputs.push(sample(el, cs));
    else if (tag === "A" && hasText && links.length < 5) {
      const key = cs.color + cs.textDecorationLine;
      if (!seenLink.has(key)) { seenLink.add(key); links.push(sample(el, cs)); tally(ac, cs.color, 1); }
    }
    else if (cards.length < 6 && r.width > 200 && r.height > 120 && r.width < 800 && !isTransparent(cs.backgroundColor) && (cs.borderRadius !== "0px" || cs.boxShadow !== "none" || cs.borderTopStyle !== "none") && el.children.length >= 2) {
      cards.push(sample(el, cs));
    }
  }

  // Variables CSS declaradas en :root / html / body
  const vars = {};
  try {
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (!rule.selectorText || !/^(:root|html|body)(\\s*,\\s*(:root|html|body))*$/.test(rule.selectorText.trim())) continue;
        for (const name of rule.style) {
          if (name.startsWith("--") && Object.keys(vars).length < 120) vars[name] = rule.style.getPropertyValue(name).trim();
        }
      }
    }
  } catch {}

  const loaded = new Set();
  try { document.fonts.forEach(f => { if (f.status === "loaded") loaded.add(f.family.replace(/["']/g, "") + " " + f.weight); }); } catch {}
  const fontLinks = [...document.querySelectorAll('link[rel="stylesheet"][href*="font"], link[href*="fonts.googleapis"], link[href*="typekit"], link[href*="fonts.bunny"]')].map(l => l.href).slice(0, 6);

  const meta = (n) => document.querySelector('meta[name="' + n + '"], meta[property="' + n + '"]')?.getAttribute("content") || "";
  const bcs = getComputedStyle(document.body);
  const anim = [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.type === 7); } catch { return false; } });

  return {
    title: document.title, description: meta("description") || meta("og:description"),
    themeColor: meta("theme-color") || null, lang: document.documentElement.lang || "",
    pageHeight: document.documentElement.scrollHeight,
    body: { background: bcs.backgroundColor, color: bcs.color, fontFamily: cleanFont(bcs.fontFamily), fontSize: bcs.fontSize, lineHeight: bcs.lineHeight },
    fonts: { loaded: [...loaded].slice(0, 30), families: top(fam, 6), links: fontLinks },
    colors: { backgrounds: topColors(bg, 8), text: topColors(tx, 6), borders: topColors(bd, 4), accents: topColors(ac, 5) },
    typography: { sizes: top(sz, 12), weights: top(wt, 6), lineHeights: top(lh, 8), letterSpacings: top(ls, 6), headings, paragraphs },
    spacing: { paddings: top(pad, 12), gaps: top(gap, 10), margins: top(mar, 8), maxWidths: top(mw, 5) },
    radii: top(rad, 8), shadows: top(sh, 6), cssVariables: vars,
    components: { buttons, inputs, links, cards },
    motion: { transitions: top(tr, 8), hasScrollAnimations: anim || !!document.querySelector("[data-aos], [data-scroll], .gsap, [data-framer-name]") },
    stats: { elementsScanned: scanned, imagesCount: document.images.length, hasVideo: !!document.querySelector("video") },
  };
})()`;

// ─── API ─────────────────────────────────────────────────────────────────────

// `signal`: si el usuario para la generación se cierra Chromium al momento y no se
// sigue gastando tiempo ni capturas. Cualquier paso pendiente falla y la ruta lo traduce.
export async function extractDesign(url: string, signal?: AbortSignal): Promise<ExtractResult> {
  signal?.throwIfAborted();
  const browser = await launch();
  const onAbort = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 InspoBot/1.0");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9,es;q=0.8" });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(async () => {
      // Algunos sitios nunca llegan a idle (analytics, websockets). Seguimos con lo que haya.
      await page.waitForSelector("body", { timeout: 5000 });
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Scroll suave para disparar lazy-load / animaciones on-scroll, y vuelta arriba.
    await page.evaluate(`(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < Math.min(h, 6000); y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const raw = (await page.evaluate(COLLECT)) as Omit<DesignTokens, "url" | "finalUrl" | "viewport"> & { pageHeight: number };
    const screenshot = Buffer.from(await page.screenshot({ type: "jpeg", quality: 70, fullPage: false }));
    const fullHeight = Math.min(raw.pageHeight, 6000);
    const fullShot = Buffer.from(await page.screenshot({
      type: "jpeg", quality: 60,
      clip: { x: 0, y: 0, width: 1440, height: fullHeight },
      captureBeyondViewport: true,
    }));

    // Versiones ligeras para el grid: mismo viewport a escala 0.5
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 0.5 });
    await new Promise((r) => setTimeout(r, 300));
    const cover = Buffer.from(await page.screenshot({ type: "jpeg", quality: 72, fullPage: false }));
    const scroll = Buffer.from(await page.screenshot({
      type: "jpeg", quality: 55,
      clip: { x: 0, y: 0, width: 1440, height: Math.min(raw.pageHeight, 4500) },
      captureBeyondViewport: true,
    }));

    const { pageHeight, ...rest } = raw;
    const tokens: DesignTokens = oklchToHex({
      url,
      finalUrl: page.url(),
      viewport: { width: 1440, height: 900, pageHeight },
      ...rest,
    });
    signal?.throwIfAborted();
    return { tokens, screenshot, fullShot, cover, scroll };
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await browser.close().catch(() => {});
  }
}

// Tailwind v4 sites report computed colors as oklch(). Models convert them in their
// head and get it wrong (21st.dev's CTA #1436f4 came back as #4b73ff), so we do it here.
const OKLCH = /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+)(%?))?\s*\)/g;

export function oklchToHex<T>(tokens: T): T {
  const hex = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 255).toString(16).padStart(2, "0");
  const gamma = (x: number) => (x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055);
  const json = JSON.stringify(tokens).replace(OKLCH, (_, l, lp, c, h, a, ap) => {
    const L = lp ? Number(l) / 100 : Number(l), rad = (Number(h) * Math.PI) / 180;
    const A = Number(c) * Math.cos(rad), B = Number(c) * Math.sin(rad);
    const l3 = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
    const m3 = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
    const s3 = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
    const r = gamma(4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3);
    const g = gamma(-1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3);
    const b = gamma(-0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3);
    const alpha = a === undefined ? "" : hex(ap ? Number(a) / 100 : Number(a));
    return `#${hex(r)}${hex(g)}${hex(b)}${alpha === "ff" ? "" : alpha}`;
  });
  return JSON.parse(json);
}
