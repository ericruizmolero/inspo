// Step 2 of "why it's here": a headless browser goes to look for what the team pointed at.
// The words decide the plan (a cheap model turns "the sound between sidebar items" into
// targets and probes); the browser then hovers those elements, listens for audio, checks
// the cursor and watches what moves on scroll. Everything it reports is observed, never guessed.
import "server-only";
import { z } from "zod";
import type { Page } from "puppeteer-core";
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
    sections: z.array(z.number()).describe("Ids of the SECTIONS that show it, from the list (at most 2, the most specific ones). Empty only if it is not visible anywhere on the page."),
    kind: Kind.describe("Where its interactive part lives in the DOM, if any. 'page' for things that are not one element (scroll behaviour, the cursor, sound in general) or for purely visual things."),
    text: z.array(z.string()).describe("Words likely found in the interactive element's own label or class name, lowercase (e.g. 'projects', 'about', 'menu'). Not the phenomenon itself: never 'sound', 'hover' or 'animation'. Empty if unknown or purely visual."),
    probes: z.array(ProbeKind).min(1).describe("capture: photograph the sections (always, when sections are given). hover: state changes on mouse over. audio: sound on interaction (always paired with hover). scroll: things that move or appear while scrolling. cursor: a custom cursor."),
  })),
});
export type ProbePlan = z.infer<typeof PlanSchema> & { model: string; costUsd: number | null; usage: { input: number; output: number; cacheRead: number } };

const PLAN_SYSTEM = `A design team wrote notes about why they saved a website. A headless browser has the page open and will do what you plan: capture the sections the notes point at, hover elements, listen for sound, check the cursor, watch the scroll.

You receive the notes, a full-page screenshot (top to bottom) and the list of the page's SECTIONS with their vertical position and a text snippet. For each distinct thing the notes mention, say which sections show it and what the browser should do there. Locate visually: match what the person describes with what the screenshot shows at that height.

Rules:
- Only things the notes actually mention. A general remark ("the whole site", "nice") gets no target.
- Purely visual things (an illustration, a portrait, a layout, a type treatment) get "capture" and their sections. Interactive things get hover/audio/scroll/cursor as well, plus the section where they live.
- At most four targets, at most two sections each. Prefer the specific section over the whole page.`;

export interface PageSection { i: number; tag: string; y: number; h: number; text: string; imgs: number; cls: string }

async function planOnPage(voices: Voice[], sections: PageSection[], fullShot: Buffer, signal?: AbortSignal): Promise<ProbePlan> {
  const res = await llm({
    model: PLAN_MODEL,
    system: PLAN_SYSTEM,
    image: fullShot,
    text: `Notes:\n${voices.map((v, i) => `${i + 1}. ${v.author}: """${v.body}"""`).join("\n")}\n\nSECTIONS (id, tag, top y in px, height, images, text):\n${sections.map((x) => `${x.i}. <${x.tag}${x.cls ? ` class="${x.cls}"` : ""}> y=${x.y} h=${x.h} imgs=${x.imgs} "${x.text}"`).join("\n")}`,
    schema: PlanSchema,
    maxTokens: 1500,
    signal,
  });
  // The limits in the descriptions are advice the model sometimes ignores: clamp here instead of failing
  const parsed = PlanSchema.parse(JSON.parse(res.text));
  const targets = parsed.targets.slice(0, 4).map((t) => ({ ...t, sections: t.sections.slice(0, 2), text: t.text.slice(0, 4) }));
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

export interface Capture { id: string; hint: string; sectionId: number; text: string; box: { y: number; h: number }; jpeg: Buffer }

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
  const P = window.__probe = { plays: 0, contexts: 0, howler: false };
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () { P.plays++; return play.apply(this, arguments); };
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
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(async () => { await page.waitForSelector("body", { timeout: 5000 }); });
    await settle(page, 1200);
    // Wake the page: lazy content, scroll libraries, then back to the top
    await page.evaluate(`(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < Math.min(h, 4000); y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } window.scrollTo(0, 0); })()`);
    await settle(page, 500);

    const sections = (await page.evaluate(SECTIONS)) as PageSection[];
    const pageHeight = (await page.evaluate("document.documentElement.scrollHeight")) as number;
    const fullShot = Buffer.from(await page.screenshot({ type: "jpeg", quality: 50, clip: { x: 0, y: 0, width: 1440, height: Math.min(pageHeight, 6000) }, captureBeyondViewport: true }));
    const plan = await planOnPage(voices, sections, fullShot, signal);
    if (process.env.PROBE_DEBUG) console.log("probe plan:", JSON.stringify(plan.targets), "sections:", sections.map((x) => `${x.i}:${x.tag}@${x.y}+${x.h}`).join(" "));
    if (!plan.targets.length) return null;
    const wants = (p: z.infer<typeof ProbeKind>) => plan.targets.some((t) => t.probes.includes(p));

    // Captures first, while nothing has been hovered: each section scrolled into view (lazy media, entrance animations) then clipped
    const captures: Capture[] = [];
    for (const target of plan.targets) {
      for (const sid of target.sections.slice(0, 2)) {
        const sec = sections.find((x) => x.i === sid);
        if (!sec || captures.some((c) => c.sectionId === sid)) continue;
        try {
          await page.evaluate(`window.scrollTo(0, ${Math.max(0, sec.y - 80)})`); await settle(page, 700);
          const r = (await page.evaluate(`(() => { const el = document.querySelector('[data-probe-s="${sid}"]'); if (!el) return null; const b = el.getBoundingClientRect(); return { y: Math.round(b.y + scrollY), h: Math.round(b.height) }; })()`)) as { y: number; h: number } | null;
          if (!r || r.h < 60) continue;
          const height = Math.min(r.h, 1800);
          const jpeg = Buffer.from(await page.screenshot({ type: "jpeg", quality: 68, clip: { x: 0, y: r.y, width: 1440, height }, captureBeyondViewport: true }));
          captures.push({ id: `s${sid}`, hint: target.hint, sectionId: sid, text: sec.text, box: { y: r.y, h: height }, jpeg });
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
    }
    await page.mouse.move(5, 5);

    const a = await audioAt();
    const customCursor = (await page.evaluate(`(() => { for (const el of document.querySelectorAll('[class*="cursor"]')) { const cs = getComputedStyle(el); if ((cs.position === "fixed" || cs.position === "absolute") && cs.pointerEvents === "none") return true; } return getComputedStyle(document.body).cursor === "none"; })()`)) as boolean;
    const audio = { tags: a.tags, contexts: a.contexts, plays: a.plays, howler: a.howler, total: a.plays + a.contexts };
    // A sound toggle means the site has sound that a fresh visit may keep off
    const soundToggle = (await page.evaluate(`(() => { for (const el of document.querySelectorAll("button, a, [role=switch], [role=button]")) { const t = ((el.getAttribute("aria-label") || "") + " " + (el.innerText || "") + " " + (typeof el.className === "string" ? el.className : "")).toLowerCase(); if (/\\b(sound|audio|mute|unmute|volume|sfx)\\b/.test(t)) return t.trim().slice(0, 60); } return null; })()`)) as string | null;

    // The factual lines
    const summary: string[] = [];
    if (captures.length) summary.push(`captured ${captures.length} section${captures.length > 1 ? "s" : ""}: ${captures.map((c) => `${c.hint} (y ${c.box.y}, ${c.box.h}px)`).join(", ")}`);
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
