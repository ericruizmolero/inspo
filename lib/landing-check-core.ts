// What a landing does for its goal, read from the rendered page and not from its code. These rules hold for any landing;
// taste stays with the project's own decisions, which the agent's model judges with the facts below. Pure, so a local run
// on localhost and the server read the same way.
export interface PageFacts {
  width: number;
  h1: string;
  /** Every visible text in the first screen */
  firstScreen: string;
  /** Filled buttons and links: what a visitor reads as an action */
  actions: { text: string; top: number }[];
  viewportHeight: number;
  scrollWidth: number;
  images: number;
  brokenImages: number;
  text: string;
}

export interface Finding { rule: string; ok: boolean; detail: string }

/** Case matters for TODO: a product's own word "Todo" is not a mark */
const MARKS = /\[(?:proof needed|falta prueba)[^\]]*\]|[Ll]orem ipsum|\bTODO\b/g;
const label = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();

export function landingFindings(desktop: PageFacts, phone: PageFacts): Finding[] {
  const labels = [...new Set(desktop.actions.map((a) => label(a.text)))];
  const firstOnPhone = phone.actions.find((a) => a.top < phone.viewportHeight);
  const marks = desktop.text.match(MARKS) ?? [];
  return [
    { rule: "landing-one-action", ok: labels.length > 0 && labels.length <= 2, detail: labels.length ? `Primary actions on the page: ${labels.slice(0, 6).join(", ")}.` : "No primary action found." },
    { rule: "landing-action-first-screen-phone", ok: !!firstOnPhone, detail: firstOnPhone ? `"${firstOnPhone.text}" is visible without scrolling on a phone.` : "On a phone, no action is visible without scrolling." },
    { rule: "landing-headline", ok: !!desktop.h1.trim(), detail: desktop.h1.trim() ? `Headline: ${desktop.h1.trim()}` : "The page has no h1." },
    { rule: "landing-phone-fits", ok: phone.scrollWidth <= phone.width + 1, detail: phone.scrollWidth <= phone.width + 1 ? "Nothing overflows on a phone." : `The page is ${phone.scrollWidth}px wide on a ${phone.width}px phone.` },
    { rule: "landing-images-load", ok: desktop.brokenImages === 0, detail: desktop.brokenImages ? `${desktop.brokenImages} of ${desktop.images} pictures do not load.` : `${desktop.images} pictures load.` },
    { rule: "landing-no-marks-left", ok: !marks.length, detail: marks.length ? `Marks still on the page: ${[...new Set(marks)].slice(0, 5).join(", ")}.` : "No placeholder marks left." },
  ];
}
