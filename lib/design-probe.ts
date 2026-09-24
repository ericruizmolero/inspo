// Step 2 of "why it's here": a headless browser goes to look for what the team pointed at.
// The words decide the plan (a cheap model turns "the sound between sidebar items" into
// targets and probes); the browser then hovers those elements, listens for audio, checks
// the cursor and watches what moves on scroll. Everything it reports is observed, never guessed.
import "server-only";
import { z } from "zod";
import type { Browser, Page } from "puppeteer-core";
import { launch } from "./design-extract";
import { llm } from "./llm";
import type { Voice } from "./design-why";

// Locating a section from a description needs eyes and judgment: the same model as the "why"
export const PLAN_MODEL = process.env.DESIGN_WHY_MODEL || "anthropic/claude-sonnet-5";

// ─── Plan ────────────────────────────────────────────────────────────────────
// Decided on the open page: the model sees the whole page and its sections with their
// position, so "the 3D of Arantxa" becomes "capture section 7" and "the sidebar sound"
// becomes "hover the aside's items and listen".

const Kind = z.enum(["nav", "aside", "header", "footer", "button", "link", "image", "card", "page"]);
const ProbeKind = z.enum(["capture", "hover", "audio", "scroll", "cursor"]);
const PlanSchema = z.object({
  targets: z.array(z.object({
    hint: z.string().describe("The thing the person pointed at, in 2-6 English words"),
    sections: z.array(z.number()).describe("Ids of the SECTIONS that show it, from the list (up to 3, the most specific ones). Empty if it is not visible anywhere on the page or if the IMAGES already cover it."),
    images: z.array(z.number()).describe("Ids of the IMAGES that show it, from the list (up to 6). For a note about photos, mockups, illustrations or renders, list every image that shows it, not one."),
    kind: Kind.describe("Where its interactive part lives in the DOM, if any. 'page' for things that are not one element (scroll behaviour, the cursor, sound in general) or for purely visual things."),
    text: z.array(z.string()).describe("Words likely found in the interactive element's own label or class name, lowercase (e.g. 'projects', 'about', 'menu'). Not the phenomenon itself: never 'sound', 'hover' or 'animation'. Empty if unknown or purely visual."),
    probes: z.array(ProbeKind).min(1).describe("capture: photograph the sections (always, when sections are given). hover: state changes on mouse over. audio: sound on interaction (always paired with hover). scroll: things that move or appear while scrolling. cursor: a custom cursor."),
  })),
});
export type ProbePlan = z.infer<typeof PlanSchema> & { model: string; costUsd: number | null; usage: { input: number; output: number; cacheRead: number } };

const PLAN_SYSTEM = `A design team wrote notes about why they saved a website. A headless browser has the page open and will do what you plan: capture the sections the notes point at, hover elements, listen for sound, check the cursor, watch the scroll.

You receive the notes, a full-page screenshot (top to bottom), the list of the page's SECTIONS with their vertical position and a text snippet, and the list of its large IMAGES with their position. For each distinct thing the notes mention, say which sections and images show it and what the browser should do there. Locate visually: match what the person describes with what the screenshot shows at that height.

Rules:
- Only things the notes actually mention. A general remark ("the whole site", "nice") gets no target.
- Purely visual things (an illustration, a portrait, a layout, a type treatment) get "capture" and their sections. Interactive things get hover/audio/scroll/cursor as well, plus the section where they live.
- At most four targets, up to three sections and six images each. Prefer the specific section over the whole page, and the images themselves when the note is about images: if the page has many mockups and the note says "mockups", list them all.`;

export interface PageSection { i: number; tag: string; y: number; h: number; text: string; imgs: number; cls: string }
export interface PageImage { i: number; tag: string; x: number; y: number; w: number; h: number; alt: string }

async function planOnPage(voices: Voice[], sections: PageSection[], images: PageImage[], fullShot: Buffer, signal?: AbortSignal): Promise<ProbePlan> {
  const res = await llm({
    model: PLAN_MODEL,
    system: PLAN_SYSTEM,
    image: fullShot,
    text: `Notes:\n${voices.map((v, i) => `${i + 1}. ${v.author}: """${v.body}"""`).join("\n")}\n\nSECTIONS (id, tag, top y in px, height, images, text):\n${sections.map((x) => `${x.i}. <${x.tag}${x.cls ? ` class="${x.cls}"` : ""}> y=${x.y} h=${x.h} imgs=${x.imgs} "${x.text}"`).join("\n")}\n\nIMAGES (id, tag, x, y, width, height, alt):\n${images.map((m) => `${m.i}. <${m.tag}> x=${m.x} y=${m.y} ${m.w}x${m.h}${m.alt ? ` "${m.alt}"` : ""}`).join("\n")}`,
    schema: PlanSchema,
    maxTokens: 1500,
    signal,
  });
  // The limits in the descriptions are advice the model sometimes ignores: clamp here instead of failing
  const parsed = PlanSchema.parse(JSON.parse(res.text));
  const targets = parsed.targets.slice(0, 4).map((t) => ({ ...t, sections: t.sections.slice(0, 3), images: t.images.slice(0, 6), text: t.text.slice(0, 4) }));
  return { targets, model: res.model, costUsd: res.costUsd, usage: res.usage };
}

// ─── Report ──────────────────────────────────────────────────────────────────

export interface HoverResult {
  tag: string; text: string; box: { x: number; y: number; w: number; h: number };
  /** Computed style properties that changed on hover: prop → [before, after] */
  changed: Record<string, [string, string]>;
  transition: string;
  /** Audio events (play() calls or AudioContext creations) fired while hovering */
  audioEvents: number;
  cursor: string;
}

export interface Capture {
  id: string; hint: string; kind: "section" | "image" | "video" | "audio"; sectionId: number; text: string;
  box: { y: number; h: number }; data: Buffer; mime: string; ext: string;
  /** Videos and sounds: their length */
  ms?: number;
}

export interface ProbeReport {
  plan: ProbePlan;
  /** Sections photographed for the notes (the jpeg stays server-side; the route saves and links them) */
  captures: Capture[];
  audio: { tags: number; contexts: number; plays: number; howler: boolean; total: number };
  cursor: { css: string[]; customElement: boolean };
  scroll: { sampled: number; animated: number } | null;
  targets: { hint: string; kind: string; probes: string[]; matched: number; elements: HoverResult[] }[];
  /** Short factual lines for the sheet and the model */
  summary: string[];
  ms: number;
}

// Runs before any script of the page: counts sound the page makes, however it makes it
const AUDIO_HOOK = `(() => {
  const P = window.__probe = { plays: 0, contexts: 0, howler: false, srcs: [] };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { P.plays++; const src = this.currentSrc || this.src; if (src && !P.srcs.includes(src)) P.srcs.push(src); return play.apply(this, arguments); };
  for (const name of ["AudioContext", "webkitAudioContext"]) {
    const Orig = window[name];
    if (!Orig) continue;
    const Wrapped = function (...a) { P.contexts++; return new Orig(...a); };
    Wrapped.prototype = Orig.prototype;
    window[name] = Wrapped;
  }
  Object.defineProperty(window, "Howler", { configurable: true, set(v) { P.howler = true; Object.defineProperty(window, "Howler", { value: v, writable: true, configurable: true }); }, get() { return undefined; } });
})()`;

// Candidate elements: landmarks and interactive things, tagged so we can hover them later
const CANDIDATES = `(() => {
  const out = [];
  const seen = new Set();
  const push = (el, role) => {
    if (seen.has(el) || out.length >= 400) return;
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    seen.add(el);
    const i = out.length;
    el.setAttribute("data-probe-i", String(i));
    const cs = getComputedStyle(el);
    out.push({
      i, role, tag: el.tagName.toLowerCase(),
      text: (el.getAttribute("aria-label") || el.innerText || el.getAttribute("alt") || "").trim().replace(/\\s+/g, " ").slice(0, 60).toLowerCase(),
      cls: (typeof el.className === "string" ? el.className : "").slice(0, 80).toLowerCase(),
      box: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
      fixed: cs.position === "fixed" || cs.position === "sticky",
      vertical: r.height > r.width * 1.5,
      children: el.querySelectorAll("a, button").length,
    });
  };
  for (const el of document.querySelectorAll("nav, aside, header, footer, [role=navigation], [role=banner], [role=contentinfo], [class*=sidebar], [class*=side-nav], [class*=menu], ul, ol")) push(el, "landmark");
  // Fixed or sticky blocks holding several links are sidebars and menus without saying so
  for (const el of document.querySelectorAll("div, section")) { const cs = getComputedStyle(el); if ((cs.position === "fixed" || cs.position === "sticky") && el.querySelectorAll("a, button").length >= 2) push(el, "landmark"); }
  // Links inside landmarks first (menus, sidebars), so a long grid of cards cannot crowd them out
  for (const box of Array.from(seen)) for (const el of box.querySelectorAll("a, button, [role=button], [role=menuitem], [role=tab]")) push(el, "interactive");
  for (const el of document.querySelectorAll("a, button, [role=button], [role=menuitem], [role=tab]")) push(el, "interactive");
  for (const el of document.querySelectorAll("img, video, canvas, svg")) push(el, "media");
  return out;
})()`;

// The page's sections: big blocks in document order, wrappers skipped, tagged for capture
const SECTIONS = `(() => {
  const out = [];
  const W = innerWidth, H = innerHeight;
  const big = (el) => el.getBoundingClientRect().height >= 120;
  const walk = (el, depth) => {
    if (depth > 6 || out.length >= 40) return;
    for (const ch of el.children) {
      const tag = ch.tagName.toLowerCase();
      if (["script", "style", "noscript", "template"].includes(tag)) continue;
      const r = ch.getBoundingClientRect();
      if (r.height < 120 || r.width < W * 0.4) continue;
      const kids = [...ch.children].filter(big);
      const wrapper = kids.length === 1 && kids[0].getBoundingClientRect().height > r.height * 0.85;
      if (wrapper || (r.height > H * 2.5 && kids.length > 1)) { walk(ch, depth + 1); continue; }
      const i = out.length;
      ch.setAttribute("data-probe-s", String(i));
      out.push({ i, tag, y: Math.round(r.y + scrollY), h: Math.round(r.height), text: (ch.innerText || "").trim().replace(/\\s+/g, " ").slice(0, 90), imgs: ch.querySelectorAll("img, video, canvas, svg, picture").length, cls: (typeof ch.className === "string" ? ch.className : "").trim().split(/\\s+/).slice(0, 3).join(" ").slice(0, 40) });
    }
  };
  walk(document.body, 0);
  return out;
})()`;

// Large images on the page, tagged for capture: the mockups, the renders, the photos a note may mean
const IMAGES = `(() => {
  const out = [];
  const seenSrc = new Set();
  for (const el of document.querySelectorAll("img, picture, video, canvas, svg, [style*=background-image]")) {
    if (out.length >= 60) break;
    if (el.closest("picture") && el.tagName !== "PICTURE") continue;
    const r = el.getBoundingClientRect();
    if (r.width < 240 || r.height < 160 || r.width > innerWidth * 1.2) continue;
    // The same picture twice (a lazy placeholder under the real image, a picture and its img): keep one
    const y = r.y + scrollY;
    const dup = out.some((o) => { const ix = Math.max(0, Math.min(o.x + o.w, r.x + r.width) - Math.max(o.x, r.x)); const iy = Math.max(0, Math.min(o.y + o.h, y + r.height) - Math.max(o.y, y)); return ix * iy >= 0.8 * Math.min(o.w * o.h, r.width * r.height); });
    if (dup) continue;
    // The same file shown twice (a repeated card, a carousel clone): once is enough
    const inner = el.tagName === "PICTURE" ? el.querySelector("img") : el;
    const src = (inner && (inner.currentSrc || inner.src)) || (getComputedStyle(el).backgroundImage.match(/url\\(["']?([^"')]+)/) || [])[1] || "";
    const key = src.replace(/^https?:\\/\\/[^/]+/, "").replace(/\\?.*$/, "");
    if (key && seenSrc.has(key)) continue;
    if (key) seenSrc.add(key);
    const i = out.length;
    el.setAttribute("data-probe-img", String(i));
    out.push({ i, tag: el.tagName.toLowerCase(), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), alt: (el.getAttribute("alt") || el.getAttribute("aria-label") || "").trim().slice(0, 60) });
  }
  return out;
})()`;

// Cookie banners sit on top of everything and end up in every capture: accept or hide them first
const COOKIES = `(() => {
  const yes = /^(accept|accept all|allow|allow all|agree|i agree|ok|okay|got it|aceptar|aceptar todo|aceptar todas|acepto|entendido|de acuerdo|permitir|consent|continue)\\b/i;
  for (const b of document.querySelectorAll("button, a, [role=button]")) {
    const box = b.closest("[class*=cookie], [id*=cookie], [class*=consent], [id*=consent], [class*=gdpr], [aria-label*=cookie]");
    if (box && yes.test((b.innerText || "").trim())) { b.click(); return "clicked"; }
  }
  let hidden = 0;
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    if ((cs.position === "fixed" || cs.position === "sticky") && /cookie/i.test(el.innerText || "") && el.getBoundingClientRect().height < innerHeight * 0.6) { el.style.setProperty("display", "none", "important"); hidden++; }
  }
  return hidden ? "hidden " + hidden : "none";
})()`;

interface Candidate { i: number; role: "landmark" | "interactive" | "media"; tag: string; text: string; cls: string; box: HoverResult["box"]; fixed: boolean; vertical: boolean; children: number }

const STYLE_PROPS = ["color", "background-color", "border-color", "opacity", "transform", "box-shadow", "text-decoration-line", "filter", "letter-spacing", "font-weight", "scale", "translate"];

const snapshotFn = `(i) => {
  const el = document.querySelector('[data-probe-i="' + i + '"]');
  if (!el) return null;
  const cs = getComputedStyle(el);
  const props = ${JSON.stringify(STYLE_PROPS)};
  const s = {};
  for (const p of props) s[p] = cs.getPropertyValue(p);
  // Text inside changes too (an underline, a color on the label)
  const inner = el.querySelector("span, p, h1, h2, h3, img, svg");
  if (inner) { const ic = getComputedStyle(inner); for (const p of ["color", "opacity", "transform", "text-decoration-line"]) s["child:" + p] = ic.getPropertyValue(p); }
  const P = window.__probe || { plays: 0, contexts: 0 };
  return { s, transition: cs.transition, cursor: cs.cursor, audio: P.plays + P.contexts };
}`;

function pickElements(target: ProbePlan["targets"][number], cands: Candidate[]): Candidate[] {
  const hints = target.text.map((t) => t.toLowerCase()).filter(Boolean);
  const byText = (c: Candidate) => hints.some((h) => c.text.includes(h) || c.cls.includes(h));
  const kindOf = (c: Candidate) => {
    switch (target.kind) {
      case "nav": return c.tag === "nav" || c.cls.includes("nav") || c.cls.includes("menu");
      case "aside": return c.tag === "aside" || c.cls.includes("sidebar") || c.cls.includes("side") || (c.role === "landmark" && c.vertical);
      case "header": return c.tag === "header" || c.cls.includes("header");
      case "footer": return c.tag === "footer" || c.cls.includes("footer");
      case "button": return c.tag === "button" || c.cls.includes("btn") || c.cls.includes("button");
      case "link": return c.tag === "a";
      case "image": return c.role === "media";
      case "card": return c.cls.includes("card") || c.cls.includes("item") || c.cls.includes("tile");
      default: return false;
    }
  };
  if (target.kind === "page") return [];
  // A landmark container gives its first interactive children: that is what people hover.
  // A "sidebar" is often just a fixed vertical block with links, with no aside or class to say so.
  let containers = cands.filter((c) => c.role === "landmark" && kindOf(c)).sort((a, b) => Number(byText(b)) - Number(byText(a)) || b.children - a.children);
  if (!containers.length && (target.kind === "aside" || target.kind === "nav")) containers = cands.filter((c) => c.role === "landmark" && c.children >= 2 && (c.vertical || c.fixed)).sort((a, b) => Number(b.vertical) - Number(a.vertical) || b.children - a.children);
  if (!containers.length && (target.kind === "aside" || target.kind === "nav")) containers = cands.filter((c) => c.role === "landmark" && c.children >= 2).sort((a, b) => b.children - a.children);
  const picked: Candidate[] = [];
  for (const box of containers.slice(0, 2)) {
    const inside = cands.filter((c) => c.role === "interactive" && c.box.x >= box.box.x - 2 && c.box.y >= box.box.y - 2 && c.box.x + c.box.w <= box.box.x + box.box.w + 2 && c.box.y + c.box.h <= box.box.y + box.box.h + 2);
    // Spread over the whole block: a sound or a state change may live on the later items only
    const n = Math.min(inside.length, target.probes.includes("audio") ? 8 : 4);
    const step = Math.max(1, Math.floor(inside.length / n));
    for (let k = 0; k < inside.length && picked.length < n; k += step) if (!picked.includes(inside[k])) picked.push(inside[k]);
  }
  if (picked.length < 2) {
    const direct = cands.filter((c) => c.role !== "landmark" && (byText(c) || kindOf(c))).sort((a, b) => Number(byText(b)) - Number(byText(a)) || b.box.w * b.box.h - a.box.w * a.box.h);
    for (const c of direct) { if (picked.length >= 5) break; if (!picked.includes(c)) picked.push(c); }
  }
  return picked.slice(0, 8);
}

async function settle(page: Page, ms: number) { await new Promise((r) => setTimeout(r, ms)); void page; }

// ─── Video of the interaction ───────────────────────────────────────────────
// The screencast streams viewport frames while the mouse sweeps the elements (as a person would run
// down a menu); the browser then encodes them itself, cropped to the region, with MediaRecorder on a
// canvas. If the page played a sound file meanwhile, it rides along as the audio track. No ffmpeg.

interface Frame { data: string; t: number }
interface Region { x: number; y: number; w: number; h: number }

const AUDIO_EXT: Record<string, string> = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "weba", "audio/mp4": "m4a", "audio/aac": "aac" };

async function recordSweep(page: Page, elements: Candidate[]): Promise<{ frames: Frame[]; region: Region; audio: { data: Buffer; mime: string; ext: string; at: number } | null; hoverAt: number[] } | null> {
  const sels = elements.slice(0, 4).map((c) => `[data-probe-i="${c.i}"]`);
  if (!sels.length) return null;
  // Everything in view at once, then the region is the union of the boxes with some air around
  await page.evaluate(`document.querySelector(${JSON.stringify(sels[0])})?.scrollIntoView({ block: "center" })`);
  await settle(page, 400);
  const boxes = (await page.evaluate(`(${JSON.stringify(sels)}).map((s) => { const el = document.querySelector(s); if (!el) return null; const b = el.getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; }).filter(Boolean)`)) as number[][];
  if (!boxes.length) return null;
  const pad = 48;
  const x0 = Math.max(0, Math.min(...boxes.map((b) => b[0])) - pad), y0 = Math.max(0, Math.min(...boxes.map((b) => b[1])) - pad);
  const x1 = Math.min(1440, Math.max(...boxes.map((b) => b[0] + b[2])) + pad), y1 = Math.min(900, Math.max(...boxes.map((b) => b[1] + b[3])) + pad);
  const region: Region = { x: Math.round(x0), y: Math.round(y0), w: Math.round(Math.max(240, x1 - x0)), h: Math.round(Math.max(160, y1 - y0)) };

  await page.mouse.move(5, 5); await settle(page, 200);
  const srcsBefore = (await page.evaluate("(window.__probe && window.__probe.srcs || []).length")) as number;
  const client = await page.createCDPSession();
  const frames: Frame[] = [];
  const t0 = Date.now();
  client.on("Page.screencastFrame", (ev: { data: string; sessionId: number }) => {
    frames.push({ data: ev.data, t: Date.now() - t0 });
    client.send("Page.screencastFrameAck", { sessionId: ev.sessionId }).catch(() => {});
  });
  await client.send("Page.startScreencast", { format: "jpeg", quality: 72, maxWidth: 1440, maxHeight: 900, everyNthFrame: 1 });
  const hoverAt: number[] = [];
  try {
    await settle(page, 500);
    for (const sel of sels) {
      hoverAt.push(Date.now() - t0);
      try { await page.hover(sel); } catch { /* covered: keep going */ }
      await settle(page, 750);
    }
    await page.mouse.move(5, 5);
    await settle(page, 600);
  } finally {
    await client.send("Page.stopScreencast").catch(() => {});
    await client.detach().catch(() => {});
  }
  if (frames.length < 3) return null;

  // A sound file the page played during the sweep: fetched from inside the page, so cookies and CORS behave
  let audio: { data: Buffer; mime: string; ext: string; at: number } | null = null;
  const srcs = (await page.evaluate("(window.__probe && window.__probe.srcs || [])")) as string[];
  const played = srcs.slice(srcsBefore)[0];
  if (played) {
    try {
      const got = (await page.evaluate(`(async () => { const r = await fetch(${JSON.stringify(played)}); if (!r.ok) return null; const b = await r.arrayBuffer(); if (b.byteLength > 3000000) return null; let s = ""; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return { b64: btoa(s), mime: r.headers.get("content-type") || "" }; })()`)) as { b64: string; mime: string } | null;
      if (got) {
        const mime = got.mime.split(";")[0] || "audio/mpeg";
        audio = { data: Buffer.from(got.b64, "base64"), mime, ext: AUDIO_EXT[mime] || played.split("?")[0].split(".").pop()?.slice(0, 4) || "mp3", at: hoverAt[0] ?? 500 };
      }
    } catch { /* not fetchable: the video stays silent */ }
  }
  return { frames, region, audio, hoverAt };
}

async function encodeWebm(browser: Browser, frames: Frame[], region: Region, audio: { data: Buffer; mime: string; at: number } | null): Promise<{ data: Buffer; ms: number } | null> {
  const page = await browser.newPage();
  try {
    await page.goto("about:blank");
    const scale = Math.min(1, 960 / region.w);
    const out = { w: Math.round(region.w * scale), h: Math.round(region.h * scale) };
    const duration = frames[frames.length - 1].t + 200;
    const res = (await page.evaluate(`(async () => {
      const frames = ${JSON.stringify(frames)}, region = ${JSON.stringify(region)}, out = ${JSON.stringify(out)}, duration = ${duration};
      const audio = ${audio ? JSON.stringify({ b64: audio.data.toString("base64"), mime: audio.mime, at: audio.at }) : "null"};
      const imgs = await Promise.all(frames.map((f) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = "data:image/jpeg;base64," + f.data; })));
      const c = document.createElement("canvas"); c.width = out.w; c.height = out.h; const ctx = c.getContext("2d");
      const stream = c.captureStream(30);
      let mime = "video/webm;codecs=vp9";
      let actx = null;
      if (audio) {
        try {
          actx = new AudioContext();
          const bin = atob(audio.b64); const u = new Uint8Array(bin.length); for (let i = 0; i < u.length; i++) u[i] = bin.charCodeAt(i);
          const buf = await actx.decodeAudioData(u.buffer);
          const dest = actx.createMediaStreamDestination();
          const src = actx.createBufferSource(); src.buffer = buf; src.connect(dest);
          for (const tr of dest.stream.getAudioTracks()) stream.addTrack(tr);
          mime = "video/webm;codecs=vp9,opus";
          src.start(actx.currentTime + audio.at / 1000);
        } catch (e) { actx = null; }
      }
      const chunks = []; const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2500000 });
      rec.ondataavailable = (e) => chunks.push(e.data);
      const done = new Promise((res) => { rec.onstop = res; });
      const draw = (im) => { if (im) ctx.drawImage(im, region.x, region.y, region.w, region.h, 0, 0, out.w, out.h); };
      draw(imgs[0]); rec.start(200);
      const start = performance.now();
      for (let i = 0; i < frames.length; i++) { const wait = frames[i].t - (performance.now() - start); if (wait > 0) await new Promise((r) => setTimeout(r, wait)); draw(imgs[i]); }
      await new Promise((r) => setTimeout(r, 250));
      rec.stop(); await done;
      if (actx) actx.close();
      const blob = new Blob(chunks, { type: "video/webm" });
      const ab = await blob.arrayBuffer(); let s = ""; const u = new Uint8Array(ab); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return { b64: btoa(s), ms: Math.round(performance.now() - start) };
    })()`)) as { b64: string; ms: number } | null;
    if (!res || !res.b64) return null;
    return { data: Buffer.from(res.b64, "base64"), ms: res.ms };
  } catch (e) {
    console.error("probe: video encode failed", e instanceof Error ? e.message : e);
    return null;
  } finally { await page.close().catch(() => {}); }
}

/** For tuning the matcher: the candidates the browser sees on a page. */
export async function listCandidates(url: string): Promise<Candidate[]> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(async () => { await page.waitForSelector("body", { timeout: 5000 }); });
    await settle(page, 1200);
    return (await page.evaluate(CANDIDATES)) as Candidate[];
  } finally { await browser.close().catch(() => {}); }
}

/** Null when the notes point at nothing the browser could show or check. */
export async function probeSite(url: string, voices: Voice[], signal?: AbortSignal): Promise<ProbeReport | null> {
  const t0 = Date.now();
  const browser = await launch();
  const onAbort = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 InspoBot/1.0");
    await page.evaluateOnNewDocument(AUDIO_HOOK);
    await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(async () => { await page.waitForSelector("body", { timeout: 5000 }); });
    await settle(page, 1200);
    // Wake the page: lazy content, scroll libraries, then back to the top
    await page.evaluate(`(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < Math.min(h, 4000); y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } window.scrollTo(0, 0); })()`);
    await settle(page, 500);

    await page.evaluate(COOKIES); await settle(page, 400);
    const sections = (await page.evaluate(SECTIONS)) as PageSection[];
    const images = (await page.evaluate(IMAGES)) as PageImage[];
    const pageHeight = (await page.evaluate("document.documentElement.scrollHeight")) as number;
    const fullShot = Buffer.from(await page.screenshot({ type: "jpeg", quality: 50, clip: { x: 0, y: 0, width: 1440, height: Math.min(pageHeight, 6000) }, captureBeyondViewport: true }));
    const plan = await planOnPage(voices, sections, images, fullShot, signal);
    if (process.env.PROBE_DEBUG) console.log("probe plan:", JSON.stringify(plan.targets), "sections:", sections.map((x) => `${x.i}:${x.tag}@${x.y}+${x.h}`).join(" "), "images:", images.length);
    if (!plan.targets.length) return null;
    const wants = (p: z.infer<typeof ProbeKind>) => plan.targets.some((t) => t.probes.includes(p));

    // Captures first, while nothing has been hovered: each section scrolled into view (lazy media, entrance animations) then clipped
    const captures: Capture[] = [];
    for (const target of plan.targets) {
      for (const iid of target.images) {
        if (captures.length >= 12) break;
        const im = images.find((x) => x.i === iid);
        if (!im || captures.some((c) => c.id === `i${iid}`)) continue;
        try {
          await page.evaluate(`window.scrollTo(0, ${Math.max(0, im.y - 200)})`); await settle(page, 600);
          const r = (await page.evaluate(`(() => { const el = document.querySelector('[data-probe-img="${iid}"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; })()`)) as { x: number; y: number; w: number; h: number } | null;
          if (!r || r.w < 120 || r.h < 80) continue;
          // The image and nothing else: a padding would frame it with the page's background
          const x = Math.max(0, r.x), w = Math.min(1440 - x, r.w), h = Math.min(r.h, 1800);
          const jpeg = Buffer.from(await page.screenshot({ type: "jpeg", quality: 72, clip: { x, y: r.y, width: w, height: h }, captureBeyondViewport: true }));
          captures.push({ id: `i${iid}`, hint: target.hint, kind: "image", sectionId: -1, text: im.alt, box: { y: r.y, h }, data: jpeg, mime: "image/jpeg", ext: "jpg" });
        } catch { /* gone or covered: skip */ }
      }
      for (const sid of target.sections.slice(0, 3)) {
        if (captures.length >= 12) break;
        const sec = sections.find((x) => x.i === sid);
        if (!sec || captures.some((c) => c.sectionId === sid)) continue;
        try {
          await page.evaluate(`window.scrollTo(0, ${Math.max(0, sec.y - 80)})`); await settle(page, 700);
          const r = (await page.evaluate(`(() => { const el = document.querySelector('[data-probe-s="${sid}"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { y: Math.round(b.y + scrollY), h: Math.round(b.height) }; })()`)) as { y: number; h: number } | null;
          if (!r || r.h < 60) continue;
          const height = Math.min(r.h, 1800);
          const jpeg = Buffer.from(await page.screenshot({ type: "jpeg", quality: 68, clip: { x: 0, y: r.y, width: 1440, height }, captureBeyondViewport: true }));
          captures.push({ id: `s${sid}`, hint: target.hint, kind: "section", sectionId: sid, text: sec.text, box: { y: r.y, h: height }, data: jpeg, mime: "image/jpeg", ext: "jpg" });
        } catch { /* a section that vanished on scroll: skip it */ }
      }
    }
    await page.evaluate("window.scrollTo(0, 0)"); await settle(page, 400);

    const cands = (await page.evaluate(CANDIDATES)) as Candidate[];
    if (process.env.PROBE_DEBUG) console.log(`probe candidates: ${cands.length} (${cands.filter((c) => c.role === "landmark").length} landmarks)`, cands.filter((c) => c.role === "landmark").slice(0, 8).map((c) => `${c.tag}.${c.cls.slice(0, 30)} v=${c.vertical} f=${c.fixed} ch=${c.children}`));
    const audioAt = async () => (await page.evaluate("(() => { const P = window.__probe || {plays:0,contexts:0,howler:false}; return { plays: P.plays, contexts: P.contexts, howler: P.howler, tags: document.querySelectorAll('audio, video[autoplay]').length }; })()")) as { plays: number; contexts: number; howler: boolean; tags: number };

    // Scroll: what changes opacity or transform between the top and one viewport down
    let scroll: ProbeReport["scroll"] = null;
    if (wants("scroll")) {
      const sample = cands.filter((c) => c.role !== "landmark").slice(0, 60).map((c) => c.i);
      // Code goes as a string (Next leaves it alone) so the argument is inlined: puppeteer ignores args for string expressions
      const snap = async () => (await page.evaluate(`(${JSON.stringify(sample)}).map((i) => { const el = document.querySelector('[data-probe-i="' + i + '"]'); if (!el) return ""; const cs = getComputedStyle(el); return cs.opacity + "|" + cs.transform + "|" + cs.translate; })`)) as string[];
      const a = await snap();
      await page.evaluate("window.scrollTo(0, 900)"); await settle(page, 700);
      const b = await snap();
      await page.evaluate("window.scrollTo(0, 0)"); await settle(page, 500);
      scroll = { sampled: sample.length, animated: a.filter((v, i) => v !== b[i]).length };
    }

    // Hover: each picked element, before and after, plus any sound it makes
    const targets: ProbeReport["targets"] = [];
    const cursors = new Set<string>();
    for (const target of plan.targets) {
      if (!target.probes.some((p) => p === "hover" || p === "audio")) continue;
      const picked = pickElements(target, cands);
      const elements: HoverResult[] = [];
      for (const c of picked) {
        signal?.throwIfAborted();
        const sel = `[data-probe-i="${c.i}"]`;
        try {
          await page.evaluate(`document.querySelector(${JSON.stringify(sel)})?.scrollIntoView({ block: "center" })`);
          await settle(page, 250);
          await page.mouse.move(5, 5); await settle(page, 200);
          const before = (await page.evaluate(`(${snapshotFn})(${c.i})`)) as { s: Record<string, string>; transition: string; cursor: string; audio: number } | null;
          if (!before) continue;
          await page.hover(sel);
          await settle(page, 450);
          const after = (await page.evaluate(`(${snapshotFn})(${c.i})`)) as typeof before;
          if (!after) continue;
          const changed: HoverResult["changed"] = {};
          for (const k of Object.keys(before.s)) if (before.s[k] !== after.s[k]) changed[k] = [before.s[k], after.s[k]];
          if (after.cursor && after.cursor !== "auto" && after.cursor !== "default" && after.cursor !== "pointer") cursors.add(after.cursor.slice(0, 60));
          elements.push({ tag: c.tag, text: c.text.slice(0, 40), box: c.box, changed, transition: after.transition === "all 0s ease 0s" ? "" : after.transition.slice(0, 120), audioEvents: after.audio - before.audio, cursor: after.cursor });
        } catch { /* detached or covered element: skip it */ }
      }
      targets.push({ hint: target.hint, kind: target.kind, probes: target.probes, matched: picked.length, elements });

      // The moving picture: a sweep over the elements, recorded and encoded by the browser; sound rides along
      if (elements.length && captures.length < 14) {
        try {
          const rec = await recordSweep(page, picked);
          if (rec) {
            const vid = await encodeWebm(browser, rec.frames, rec.region, rec.audio);
            const vi = targets.length - 1;
            if (vid) captures.push({ id: `v${vi}`, hint: target.hint, kind: "video", sectionId: -1, text: `${elements.length} elements hovered in turn${rec.audio ? ", with the sound the page played" : ""}`, box: { y: rec.region.y, h: rec.region.h }, data: vid.data, mime: "video/webm", ext: "webm", ms: vid.ms });
            if (rec.audio) captures.push({ id: `a${vi}`, hint: target.hint, kind: "audio", sectionId: -1, text: "sound the page played while hovering", box: { y: rec.region.y, h: 0 }, data: rec.audio.data, mime: rec.audio.mime, ext: rec.audio.ext });
          }
        } catch (e) { console.error("probe: sweep failed", e instanceof Error ? e.message : e); }
      }
    }
    await page.mouse.move(5, 5);

    const a = await audioAt();
    const customCursor = (await page.evaluate(`(() => { for (const el of document.querySelectorAll('[class*="cursor"]')) { const cs = getComputedStyle(el); if ((cs.position === "fixed" || cs.position === "absolute") && cs.pointerEvents === "none") return true; } return getComputedStyle(document.body).cursor === "none"; })()`)) as boolean;
    const audio = { tags: a.tags, contexts: a.contexts, plays: a.plays, howler: a.howler, total: a.plays + a.contexts };
    // A sound toggle means the site has sound that a fresh visit may keep off
    const soundToggle = (await page.evaluate(`(() => { for (const el of document.querySelectorAll("button, a, [role=switch], [role=button]")) { const t = ((el.getAttribute("aria-label") || "") + " " + (el.innerText || "") + " " + (typeof el.className === "string" ? el.className : "")).toLowerCase(); if (/\\b(sound|audio|mute|unmute|volume|sfx)\\b/.test(t)) return t.trim().slice(0, 60); } return null; })()`)) as string | null;

    // The factual lines
    const summary: string[] = [];
    const stills = captures.filter((c) => c.kind === "section" || c.kind === "image");
    if (stills.length) summary.push(`captured ${stills.length} ${stills.length > 1 ? "stills" : "still"}: ${stills.map((c) => `${c.hint} (y ${c.box.y}, ${c.box.h}px)`).join(", ")}`);
    for (const c of captures) if (c.kind === "video") summary.push(`recorded a ${Math.round((c.ms ?? 0) / 100) / 10}s video of hovering: ${c.hint}${captures.some((a) => a.kind === "audio" && a.hint === c.hint) ? ", with the sound the page played" : ""}`);
    for (const t of targets) {
      if (!t.elements.length) { summary.push(t.matched ? `${t.hint}: ${t.matched} matching element${t.matched > 1 ? "s" : ""} found but none could be hovered` : `${t.hint}: no matching element found to hover`); continue; }
      const withChange = t.elements.filter((e) => Object.keys(e.changed).length);
      const props = [...new Set(withChange.flatMap((e) => Object.keys(e.changed).map((k) => k.replace("child:", ""))))];
      summary.push(`${t.hint}: hovered ${t.elements.length} ${t.elements[0].tag} element${t.elements.length > 1 ? "s" : ""}, ${withChange.length} changed${props.length ? ` (${props.join(", ")})` : ""}${t.elements.some((e) => e.transition) ? `, transition ${t.elements.find((e) => e.transition)!.transition}` : ""}`);
      const sound = t.elements.reduce((n, e) => n + e.audioEvents, 0);
      if (t.probes.includes("audio")) summary.push(sound ? `${t.hint}: ${sound} audio event${sound > 1 ? "s" : ""} while hovering` : `${t.hint}: no audio event while hovering (page has ${audio.tags} audio tag${audio.tags === 1 ? "" : "s"}, ${audio.contexts} AudioContext${audio.howler ? ", Howler present" : ""}${soundToggle ? `, a sound toggle exists: "${soundToggle}"` : ""})`);
    }
    if (wants("cursor")) summary.push(customCursor || cursors.size ? `custom cursor: ${customCursor ? "cursor element" : ""}${cursors.size ? ` css ${[...cursors].join(" / ")}` : ""}`.trim() : "cursor: browser default, no custom cursor element");
    if (scroll) summary.push(`scroll: ${scroll.animated} of ${scroll.sampled} sampled elements changed opacity or transform after scrolling one viewport`);

    return { plan, captures, audio, cursor: { css: [...cursors], customElement: customCursor }, scroll, targets, summary, ms: Date.now() - t0 };
  } finally {
    signal?.removeEventListener("abort", onAbort);
    await browser.close().catch(() => {});
  }
}
