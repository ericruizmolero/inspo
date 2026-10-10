import puppeteer, { type Browser, type Page } from "puppeteer-core";
import { gatedLaunch } from "./browser-gate";
import fs from "fs";
import { guardPage } from "./safe-fetch";
import { egressArgs } from "./egress-proxy";

// ─── Types ───────────────────────────────────────────────────────────────────

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
    backgrounds: Tally[]; // weighted by visible area
    text: Tally[];
    borders: Tally[];
    accents: Tally[]; // button / link colors
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
  // Evidence for the brief (logo, iconography, voice, framework, imagery)
  /** What the page is built with, from fingerprints in the DOM and its scripts, never from looks */
  stack: string[];
  logo: { kind: "svg" | "img" | "text"; width: number; height: number; label: string; text: string; font: string; color: string; src: string } | null;
  icons: { count: number; outline: number; filled: number; strokeWidths: Tally[]; sizes: Tally[]; libraries: string[] };
  copy: { h1: string; headings: string[]; ctas: string[]; nav: string[] };
  media: { images: number; large: number; videos: number; canvases: number; svgIllustrations: number; backgroundImages: number };
}

export interface ExtractResult {
  tokens: DesignTokens;
  screenshot: Buffer; // jpeg of the viewport at 1440px (for Claude)
  fullShot: Buffer;   // jpeg of the whole page at 1440px, up to 6000px (for the detail view)
  cover: Buffer;      // jpeg 720x450 (grid cover, ~25KB)
  scroll: Buffer;     // jpeg 720px wide, up to 2250px (strip that scrolls on hover, ~100KB)
  logo: Buffer | null; // png of the logo as it sits on the page, at 2x
  icons: string[];     // up to 8 of the page's icons as standalone svg markup, colours baked in
  logoSvg: string | null; // the logo as its own svg, its colours baked in, when the page draws it as one
  fontFiles: FontFile[]; // the file format each @font-face family is served in
}

export interface FontFile { family: string; formats: string[] }

// ─── Browser ─────────────────────────────────────────────────────────────────

const MAC_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

/** A Chromium for extraction and the probe, behind the shared gate (lib/browser-gate.ts). */
export const launch = (): Promise<Browser> => gatedLaunch(launchChromium);

async function launchChromium(): Promise<Browser> {
  const local = process.env.CHROME_PATH || (process.platform === "darwin" && fs.existsSync(MAC_CHROME) ? MAC_CHROME : null);

  if (local && !process.env.VERCEL) {
    return puppeteer.launch({
      executablePath: local,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--autoplay-policy=no-user-gesture-required", ...(await egressArgs())],
    });
  }

  const chromium = (await import("@sparticuz/chromium")).default;
  chromium.setGraphicsMode = false;
  return puppeteer.launch({
    executablePath: await chromium.executablePath(),
    args: [...chromium.args, "--hide-scrollbars", "--autoplay-policy=no-user-gesture-required", ...(await egressArgs())],
    headless: true,
    defaultViewport: { width: 1440, height: 900 },
  });
}

// ─── Script that runs inside the page ────────────────────────────────────────
// Kept as a string so Next doesn't transform it and puppeteer runs it as is.

const COLLECT = `(() => {
  const MAX = 4000;
  const tally = (m, k, w = 1) => { if (!k) return; m.set(k, (m.get(k) || 0) + w); };
  const top = (m, n = 12) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, count]) => ({ value, count: Math.round(count) }));

  // Groups near-identical colors (e.g. #08090a and #090a0b) into one, summing weights.
  // Very transparent rgba (<10%) are hairlines/hover: merged into one entry per hue.
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
  let bgImages = 0;

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
    if (cs.backgroundImage.includes("url(")) bgImages++;
    if (cs.padding && cs.padding !== "0px") tally(pad, cs.padding);
    if (cs.gap && cs.gap !== "normal" && cs.gap !== "0px") tally(gap, cs.gap);
    if (cs.marginTop !== "0px" || cs.marginBottom !== "0px") tally(mar, cs.marginTop + " / " + cs.marginBottom);
    if (cs.maxWidth && cs.maxWidth !== "none" && r.width > 600) tally(mw, cs.maxWidth);
    if (cs.transitionDuration && cs.transitionDuration !== "0s") tally(tr, cs.transitionProperty.split(",")[0].trim() + " " + cs.transitionDuration.split(",")[0].trim() + " " + cs.transitionTimingFunction.split(/,(?![^(]*\\))/)[0].trim()); // commas inside cubic-bezier() are not list separators

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

  // CSS variables declared on :root / html / body
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
  } catch { /* a page whose sheets cannot be walked: no variables */ }

  const loaded = new Set();
  try { document.fonts.forEach(f => { if (f.status === "loaded") loaded.add(f.family.replace(/["']/g, "") + " " + f.weight); }); } catch { /* no font loading API */ }
  const fontLinks = [...document.querySelectorAll('link[rel="stylesheet"][href*="font"], link[href*="fonts.googleapis"], link[href*="typekit"], link[href*="fonts.bunny"]')].map(l => l.href).slice(0, 6);

  const meta = (n) => document.querySelector('meta[name="' + n + '"], meta[property="' + n + '"]')?.getAttribute("content") || "";
  const has = (sel) => { try { return !!document.querySelector(sel); } catch { return false; } };
  const txt = (el) => (el?.innerText || "").trim().replace(/\\s+/g, " ");
  const uniq = (arr, n, len) => [...new Set(arr.map((s) => s.slice(0, len)).filter((s) => s.length > 1))].slice(0, n);

  // Stack: fingerprints only. A site that hides them reads as "not detected", never as a guess.
  const w = window, root = document.documentElement;
  const srcs = [...document.scripts].map((s) => s.src).concat([...document.querySelectorAll("link[rel=stylesheet]")].map((l) => l.href)).join(" ");
  const stack = [];
  const add = (name, ok) => { if (ok && !stack.includes(name)) stack.push(name); };
  const gen = meta("generator");
  if (gen) stack.push("generator: " + gen.slice(0, 40));
  add("Next.js", has("#__next") || /\\/_next\\//.test(srcs) || !!w.__NEXT_DATA__ || !!w.__next_f);
  add("Nuxt", has("#__nuxt") || !!w.__NUXT__ || /\\/_nuxt\\//.test(srcs));
  add("Astro", has("astro-island, [data-astro-cid]"));
  add("SvelteKit", has("[data-sveltekit-preload-data], [data-sveltekit-hydrate]") || /\\/_app\\/immutable\\//.test(srcs));
  add("Gatsby", has("#___gatsby"));
  add("Remix", !!w.__remixContext);
  add("Webflow", root.hasAttribute("data-wf-site") || /webflow/.test(srcs));
  add("Framer", has("[data-framer-name], [data-framer-component-type]") || /framerusercontent|framer\\.com\\/m\\//.test(srcs));
  add("Wix", /wixstatic|parastorage/.test(srcs));
  add("Squarespace", /squarespace/.test(srcs));
  add("Shopify", !!w.Shopify || /cdn\\.shopify/.test(srcs));
  add("WordPress", /wp-content|wp-includes/.test(srcs));
  add("Vue", has("[data-v-app]") || !!w.__VUE__);
  add("React", !stack.includes("Next.js") && !stack.includes("Gatsby") && !stack.includes("Remix") && (has("[data-reactroot]") || [...document.querySelectorAll("body > div")].some((d) => Object.keys(d).some((k) => k.startsWith("__react")))));
  const TW = /^(?:[a-z0-9-]+:)*-?(?:[mp][trblxy]?-\\d|gap-\\d|text-(?:xs|sm|base|lg|[2-9]?xl)$|bg-|rounded(?:-|$)|grid-cols-|[wh]-(?:\\d|full|screen|auto|\\[)|items-|justify-|font-(?:medium|semibold|bold)$|leading-|tracking-)/;
  let twHits = 0, twAll = 0;
  for (const el of [...document.querySelectorAll("body [class]")].slice(0, 600)) {
    if (typeof el.className !== "string") continue;
    for (const c of el.className.split(/\\s+/)) { if (!c) continue; twAll++; if (TW.test(c)) twHits++; }
  }
  add("Tailwind CSS", twAll > 50 && twHits / twAll > 0.3);
  add("styled-components", has("style[data-styled]"));
  add("Emotion", has("style[data-emotion]"));
  add("GSAP", !!w.gsap || !!w.TweenMax);
  add("ScrollTrigger", !!w.ScrollTrigger);
  add("Lenis", root.classList.contains("lenis") || !!w.lenis);
  add("Locomotive Scroll", has("[data-scroll-container]"));
  add("Barba.js", has("[data-barba]"));
  add("Three.js", !!w.THREE || !!w.__THREE__);
  add("Spline", has("spline-viewer") || /spline/.test(srcs));
  add("Lottie", has("lottie-player, dotlottie-player") || !!w.lottie || !!w.bodymovin);
  add("Swiper", has(".swiper"));

  // Logo: the home link or anything called logo, in the top of the page
  // The box is what the logo paints (its svgs, images and text), not its container: a "logo"
  // wrapper can span half the header.
  const logoBox = (el) => {
    const rects = [];
    const walk = (n) => {
      if (n.nodeType === 3) { if (n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); rects.push(rg.getBoundingClientRect()); } return; }
      if (n.nodeType !== 1) return;
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) === 0) return;
      if (/^(svg|img|canvas|picture|video)$/i.test(n.tagName)) { rects.push(n.getBoundingClientRect()); return; }
      for (const c of n.childNodes) walk(c);
    };
    walk(el);
    const vis = rects.filter((r) => r.width >= 2 && r.height >= 2);
    if (!vis.length) return null;
    const x = Math.min(...vis.map((r) => r.left)), y = Math.min(...vis.map((r) => r.top));
    return { x, y, width: Math.max(...vis.map((r) => r.right)) - x, height: Math.max(...vis.map((r) => r.bottom)) - y };
  };
  const logoEl = (() => {
    const cands = document.querySelectorAll('header a[href="/"], nav a[href="/"], a[href="' + location.origin + '/"], a[aria-label*="home" i], [class*="logo" i], [id*="logo" i], img[alt*="logo" i], svg[aria-label*="logo" i]');
    for (const el of cands) {
      const b = logoBox(el);
      if (b && b.width >= 12 && b.height >= 8 && b.width <= 480 && b.height <= 160 && b.y < 240 && b.y >= -5) return el;
    }
    return null;
  })();
  window.__inspoLogoBox = () => (logoEl ? logoBox(logoEl) : null);
  let logo = null;
  if (logoEl) {
    const r = logoBox(logoEl);
    const svg = logoEl.tagName.toLowerCase() === "svg" ? logoEl : logoEl.querySelector("svg");
    const img = logoEl.tagName === "IMG" ? logoEl : logoEl.querySelector("img");
    const text = txt(logoEl).slice(0, 40);
    const cs = getComputedStyle(logoEl);
    let color = "";
    const shape = svg?.querySelector("path, rect, circle, polygon, text");
    if (shape) { const pcs = getComputedStyle(shape); color = pcs.fill !== "none" ? pcs.fill : pcs.stroke; }
    logo = {
      kind: svg ? "svg" : img ? "img" : "text", width: Math.round(r.width), height: Math.round(r.height),
      label: (logoEl.getAttribute("aria-label") || img?.alt || svg?.querySelector("title")?.textContent || "").trim().slice(0, 60),
      text, font: text ? cleanFont(cs.fontFamily) + " " + cs.fontWeight : "", color: color || (text ? cs.color : ""),
      src: img ? (img.currentSrc || img.src).split("?")[0].split("/").pop().slice(0, 60) : "",
    };
  }

  // The logo as its own svg, when the page draws it as one: its own colours baked in (a logo's colour is the brand's),
  // classes, styles and handlers out, so it draws the same anywhere and nothing in it runs
  let logoSvg = null;
  if (logoEl) {
    const svgs = logoEl.tagName.toLowerCase() === "svg" ? [logoEl] : [...logoEl.querySelectorAll("svg")];
    const s = svgs.length === 1 && !(logoEl.tagName.toLowerCase() !== "svg" && logoEl.querySelector("img")) ? svgs[0] : null;
    const sr = s ? s.getBoundingClientRect() : null;
    if (s && sr && sr.width >= 12 && sr.height >= 8 && !s.querySelector("image, foreignObject, script, use")) {
      const c = s.cloneNode(true);
      const from = [s, ...s.querySelectorAll("*")], to = [c, ...c.querySelectorAll("*")];
      from.forEach((el, i) => {
        const d = to[i];
        for (const a of [...d.attributes]) if (/^on/i.test(a.name) || a.name === "class" || a.name === "style") d.removeAttribute(a.name);
        if (!/^(path|circle|rect|line|polyline|polygon|ellipse|text)$/i.test(el.tagName)) return;
        const pcs = getComputedStyle(el);
        d.setAttribute("fill", pcs.fill);
        d.setAttribute("stroke", pcs.stroke);
        if (pcs.stroke !== "none") d.setAttribute("stroke-width", pcs.strokeWidth);
        if (pcs.opacity !== "1") d.setAttribute("opacity", pcs.opacity);
      });
      c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      if (!c.getAttribute("viewBox")) c.setAttribute("viewBox", "0 0 " + (parseFloat(s.getAttribute("width")) || Math.round(sr.width)) + " " + (parseFloat(s.getAttribute("height")) || Math.round(sr.height)));
      c.setAttribute("width", String(Math.round(sr.width)));
      c.setAttribute("height", String(Math.round(sr.height)));
      const out = new XMLSerializer().serializeToString(c);
      if (out.length <= 60000) logoSvg = out;
    }
  }

  // Icons: small svgs outside the logo (outline or filled, stroke weight) and icon fonts.
  // Up to 8 distinct shapes are kept as standalone markup, classes, styles and handlers out, so they
  // draw inside an <img> (where nothing in them can run). All in the page's ink: an icon's own colour
  // belongs to the button it sat on (white on black) and reads as nothing out of it.
  const iconSvgs = [], iconShapes = new Set();
  const ink = getComputedStyle(document.body).color;
  const SHAPE = "path, circle, rect, line, polyline, polygon, ellipse";
  const GEOM = ["d", "points", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2"];
  const serializeIcon = (s, r) => {
    if (s.querySelector("use, image, foreignObject, script")) return null;
    // Same drawing at another size or colour is the same icon
    const shape = [...s.querySelectorAll(SHAPE)].map((e) => e.tagName + GEOM.map((a) => e.getAttribute(a) || "").join(",")).join("|");
    if (!shape || iconShapes.has(shape)) return null;
    iconShapes.add(shape);
    const c = s.cloneNode(true);
    const from = [s, ...s.querySelectorAll("*")], to = [c, ...c.querySelectorAll("*")];
    from.forEach((el, i) => {
      const d = to[i];
      for (const a of [...d.attributes]) if (/^on/i.test(a.name) || a.name === "class" || a.name === "style") d.removeAttribute(a.name);
      if (!/^(path|circle|rect|line|polyline|polygon|ellipse)$/i.test(el.tagName)) return;
      const pcs = getComputedStyle(el);
      const paint = (v) => (v === "none" || /rgba\\([^)]*,\\s*0\\)/.test(v) ? "none" : ink);
      d.setAttribute("fill", paint(pcs.fill));
      d.setAttribute("stroke", paint(pcs.stroke));
      if (pcs.stroke !== "none") { d.setAttribute("stroke-width", pcs.strokeWidth); d.setAttribute("stroke-linecap", pcs.strokeLinecap); d.setAttribute("stroke-linejoin", pcs.strokeLinejoin); }
    });
    c.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    // Without a viewBox the drawing would not scale with the <img>: its user units are the old size
    if (!c.getAttribute("viewBox")) c.setAttribute("viewBox", "0 0 " + (parseFloat(s.getAttribute("width")) || Math.round(r.width)) + " " + (parseFloat(s.getAttribute("height")) || Math.round(r.height)));
    c.setAttribute("width", String(Math.round(r.width)));
    c.setAttribute("height", String(Math.round(r.height)));
    const out = new XMLSerializer().serializeToString(c);
    return out.length <= 4000 ? out : null;
  };
  const sw = new Map(), isz = new Map();
  let icount = 0, outline = 0, filled = 0, bigSvg = 0;
  for (const s of [...document.querySelectorAll("svg")].slice(0, 400)) {
    if ((logoEl && logoEl.contains(s)) || /logo/i.test(s.getAttribute("aria-label") || s.querySelector("title")?.textContent || "")) continue;
    const r = s.getBoundingClientRect();
    if (r.width < 6 || r.height < 6) continue;
    if (r.width > 120 && r.height > 120) { bigSvg++; continue; }
    if (r.width > 40 || r.height > 40) continue;
    icount++;
    tally(isz, Math.round(r.width) + "px");
    if (iconSvgs.length < 8) { const svg = serializeIcon(s, r); if (svg) iconSvgs.push(svg); }
    const shape = s.querySelector("path, circle, rect, line, polyline, polygon");
    if (!shape) continue;
    const pcs = getComputedStyle(shape);
    if (pcs.stroke !== "none" && parseFloat(pcs.strokeWidth) > 0 && (pcs.fill === "none" || pcs.fill === "rgba(0, 0, 0, 0)")) { outline++; tally(sw, pcs.strokeWidth); } else filled++;
  }
  for (const img of document.images) { const r = img.getBoundingClientRect(); if (r.width >= 6 && r.width <= 40 && r.height <= 40 && /\\.svg/.test(img.src) && !(logoEl && logoEl.contains(img))) icount++; }
  const iconLibs = [];
  const lib = (name, sel) => { if (has(sel)) iconLibs.push(name); };
  lib("Lucide", "[class*=lucide], [data-lucide]");
  lib("Font Awesome", ".fa, .fas, .far, .fab, .fa-solid, .fa-regular");
  lib("Material Symbols", ".material-symbols-outlined, .material-symbols-rounded, .material-symbols-sharp, .material-icons");
  lib("Phosphor", ".ph-bold, .ph-fill, .ph-light, .ph-thin, [class*=phosphor]");
  lib("Tabler", "[class*=tabler-icon]");
  lib("Remix Icon", "[class^='ri-'], [class*=' ri-']");
  lib("Bootstrap Icons", "[class^='bi-'], [class*=' bi-']");
  lib("Iconify", "iconify-icon, .iconify");
  lib("Heroicons", "[class*=heroicon]");

  // Copy, for the voice: the words the page chose to say out loud
  const copy = {
    h1: txt(document.querySelector("h1")).slice(0, 140),
    headings: uniq([...document.querySelectorAll("h2, h3")].map(txt), 8, 90),
    ctas: uniq([...document.querySelectorAll("button, [role=button], a[class*=btn i], a[class*=button i], a[class*=cta i]")].map(txt).filter((s) => s.length <= 32), 8, 32),
    nav: uniq([...document.querySelectorAll("header a, nav a")].map(txt), 8, 30),
  };
  const media = {
    images: document.images.length,
    large: [...document.images].filter((i) => i.getBoundingClientRect().width >= 300).length,
    videos: document.querySelectorAll("video").length,
    canvases: document.querySelectorAll("canvas").length,
    svgIllustrations: bigSvg,
    backgroundImages: bgImages,
  };
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
    stack, logo,
    icons: { count: icount, outline, filled, strokeWidths: top(sw, 4), sizes: top(isz, 4), libraries: iconLibs },
    copy, media, iconSvgs, logoSvg,
  };
})()`;

// ─── Font files ──────────────────────────────────────────────────────────────

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 InspoBot/1.0";
const FORMAT: Record<string, string> = { truetype: "ttf", opentype: "otf", "embedded-opentype": "eot", "x-font-ttf": "ttf", "x-font-woff": "woff", sfnt: "ttf" };
const RANK = ["woff2", "woff", "otf", "ttf", "eot", "svg"];

// Every @font-face of the page, read through the DevTools protocol: it sees cross-origin sheets
// (a CDN, Google Fonts, Typekit) that the page's own script is not allowed to read.
async function fontFaceRules(page: Page): Promise<string[]> {
  const cdp = await page.createCDPSession();
  const ids: string[] = [];
  cdp.on("CSS.styleSheetAdded", (e) => ids.push(e.header.styleSheetId));
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable"); // announces the sheets already there
    await new Promise((r) => setTimeout(r, 200));
    const texts = await Promise.all(ids.slice(0, 120).map((id) =>
      cdp.send("CSS.getStyleSheetText", { styleSheetId: id }).then((r) => r.text, () => "")));
    return texts.flatMap((t) => (t.match(/@font-face\s*\{[^}]*\}/g) ?? []).slice(0, 60));
  } catch {
    return [];
  } finally {
    await cdp.detach().catch(() => {}); // cleanup: the page may already be gone
  }
}

// The format of each family, from its @font-face src: format() hint, data: mime or file extension
function fontFormats(blocks: string[]): FontFile[] {
  const byFamily = new Map<string, Set<string>>();
  for (const block of blocks) {
    const family = block.match(/font-family:\s*["']?([^;"'}]+)/i)?.[1].trim();
    if (!family) continue;
    const formats = byFamily.get(family) ?? new Set<string>();
    for (const [, src, hint] of block.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)(?:\s*format\(\s*["']?([\w-]+))?/gi)) {
      const raw = hint ?? src.match(/^data:(?:font|application)\/([\w-]+)/i)?.[1] ?? src.split(/[?#]/)[0].match(/\.(woff2|woff|ttf|otf|eot|svg)$/i)?.[1];
      if (!raw) continue;
      const f = raw.toLowerCase().replace(/-variations$/, "");
      formats.add(FORMAT[f] ?? f);
    }
    byFamily.set(family, formats);
  }
  return [...byFamily]
    .filter(([, f]) => f.size)
    .map(([family, f]) => ({ family, formats: [...f].sort((a, b) => RANK.indexOf(a) - RANK.indexOf(b)) }));
}

// ─── API ─────────────────────────────────────────────────────────────────────

// `signal`: if the user stops generation, Chromium closes right away and no more
// time or screenshots are spent. Any pending step fails and the route translates it.
export async function extractDesign(url: string, signal?: AbortSignal): Promise<ExtractResult> {
  signal?.throwIfAborted();
  const browser = await launch();
  const onAbort = () => { void browser.close().catch(() => {}); }; // the run's own error reports the abort
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const page = await browser.newPage();
    await guardPage(page);
    // Reduced motion: sites that hold the page behind an intro or reveal it on scroll show everything at once.
    // Light: the same capture on any machine, not the dark mode of the Mac that runs it.
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }, { name: "prefers-color-scheme", value: "light" }]);
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setUserAgent(UA);
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9,es;q=0.8" });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(async () => {
      // Some sites never reach idle (analytics, websockets). We go on with what's there.
      await page.waitForSelector("body", { timeout: 5000 });
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Smooth scroll to trigger lazy-load / on-scroll animations, then back to top.
    await page.evaluate(`(async () => {
      const h = document.documentElement.scrollHeight;
      for (let y = 0; y < Math.min(h, 6000); y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    })()`);
    await new Promise((r) => setTimeout(r, 600));

    const raw = (await page.evaluate(COLLECT)) as Omit<DesignTokens, "url" | "finalUrl" | "viewport"> & { pageHeight: number; iconSvgs: string[]; logoSvg: string | null };
    const screenshot = Buffer.from(await page.screenshot({ type: "jpeg", quality: 70, fullPage: false }));
    const fullHeight = Math.min(raw.pageHeight, 6000);
    const fullShot = Buffer.from(await page.screenshot({
      type: "jpeg", quality: 60,
      clip: { x: 0, y: 0, width: 1440, height: fullHeight },
      captureBeyondViewport: true,
    }));

    // The logo as it sits on the page, at 2x so a 20px wordmark stays sharp
    let logo: Buffer | null = null;
    if (raw.logo) {
      await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
      await page.evaluate("window.scrollTo(0, 0)");
      await new Promise((r) => setTimeout(r, 300));
      const box = (await page.evaluate("window.__inspoLogoBox?.() ?? null")) as { x: number; y: number; width: number; height: number } | null;
      if (box) {
        const pad = 12;
        const x = Math.max(0, box.x - pad), y = Math.max(0, box.y - pad);
        logo = Buffer.from(await page.screenshot({ type: "png", clip: { x, y, width: box.width + pad * 2, height: box.height + pad * 2 } }));
      }
    }

    // Light versions for the grid: same viewport at 0.5 scale
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 0.5 });
    await new Promise((r) => setTimeout(r, 300));
    const cover = Buffer.from(await page.screenshot({ type: "jpeg", quality: 72, fullPage: false }));
    const scroll = Buffer.from(await page.screenshot({
      type: "jpeg", quality: 55,
      clip: { x: 0, y: 0, width: 1440, height: Math.min(raw.pageHeight, 4500) },
      captureBeyondViewport: true,
    }));

    const { pageHeight, iconSvgs, logoSvg, ...rest } = raw;
    const tokens: DesignTokens = oklchToHex({
      url,
      finalUrl: page.url(),
      viewport: { width: 1440, height: 900, pageHeight },
      ...rest,
    });
    signal?.throwIfAborted();
    const fontFiles = fontFormats(await fontFaceRules(page));
    return { tokens, screenshot, fullShot, cover, scroll, logo, icons: oklchToHex(iconSvgs), logoSvg: logoSvg ? oklchToHex(logoSvg) : null, fontFiles };
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await browser.close().catch(() => {}); // cleanup: a crashed browser has nothing to close
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
