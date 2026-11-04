// Opens a landing at desktop and phone width and returns what it does for its goal (lib/landing-check-core.ts). Public
// addresses only: withPage goes through the egress proxy. Nothing is stored.
import "server-only";
import { withPage } from "./browser";
import { landingFindings, type Finding, type PageFacts } from "./landing-check-core";

const READ = `(() => {
  const visible = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 1 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  // A button is small and short. A card that is one big link is not an action, and a skip link is for keyboards
  const button = (e) => { const r = e.getBoundingClientRect(), t = (e.innerText || "").trim(); return r.height <= 80 && t.length <= 40 && !/^(skip|saltar)\\b/i.test(t) && !(e.getAttribute("href") || "").match(/^#(main|content)/); };
  const filled = (e) => { const b = getComputedStyle(e).backgroundColor; return b !== "rgba(0, 0, 0, 0)" && b !== "transparent" && b !== getComputedStyle(document.body).backgroundColor; };
  const y = window.scrollY, h = innerHeight;
  const actions = [...document.querySelectorAll("a, button")].filter((e) => visible(e) && filled(e) && button(e)).map((e) => ({ text: (e.innerText || "").trim().slice(0, 60), top: Math.round(e.getBoundingClientRect().top + y) })).filter((a) => a.text);
  const first = [...document.querySelectorAll("h1,h2,h3,p,a,button,li")].filter((e) => visible(e) && e.getBoundingClientRect().top + y < h).map((e) => (e.innerText || "").trim()).filter(Boolean);
  const images = [...document.images];
  return { width: innerWidth, viewportHeight: h, h1: (document.querySelector("h1")?.innerText || "").replace(/\\s+/g, " ").trim().slice(0, 200), firstScreen: [...new Set(first)].join(" | ").slice(0, 800), actions: actions.slice(0, 30), scrollWidth: document.documentElement.scrollWidth, images: images.length, brokenImages: images.filter((i) => i.complete && !i.naturalWidth).length, text: (document.body.innerText || "").slice(0, 40000) };
})()`;

export interface LandingCheck { desktop: Omit<PageFacts, "text">; phone: Omit<PageFacts, "text">; findings: Finding[]; shots: { desktop: Buffer; phone: Buffer } }

export async function checkLanding(url: string, signal?: AbortSignal): Promise<LandingCheck> {
  return withPage("extract", async (page) => {
    const look = async (width: number, height: number) => {
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 }).catch(() => page.waitForSelector("body", { timeout: 5000 }));
      const facts = await page.evaluate(READ) as PageFacts;
      const shot = Buffer.from(await page.screenshot({ type: "jpeg", quality: 70 }));
      return { facts, shot };
    };
    const d = await look(1440, 900), p = await look(390, 844);
    const strip = ({ text: _text, ...rest }: PageFacts) => rest;
    return { desktop: strip(d.facts), phone: strip(p.facts), findings: landingFindings(d.facts, p.facts), shots: { desktop: d.shot, phone: p.shot } };
  }, signal);
}
