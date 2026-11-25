// The visitor's answer about cookies, kept in their browser. Nothing here knows what the cookies are for: whatever
// needs a yes registers with onConsent.
//
// The Worker marks <html data-consent="implied"> for a visitor outside the places that ask first
// (worker/consent-regions.ts). A page without the mark asks, so a page served any other way errs on the side of asking.
export type Choice = "granted" | "denied";

const KEY = "criterio-cookies";
const ASK_AGAIN_AFTER = 180 * 24 * 60 * 60 * 1000;

/** A saved answer, or null when there is none, it is not ours or it is more than six months old */
export function parseAnswer(raw: string | null, now: number): Choice | null {
  try {
    const { choice, at } = JSON.parse(raw ?? "") as { choice: unknown; at: number };
    if (choice !== "granted" && choice !== "denied") return null;
    return now - at < ASK_AGAIN_AFTER ? choice : null;
  } catch {
    return null;
  }
}

function saved(): Choice | null {
  try {
    return parseAnswer(localStorage.getItem(KEY), Date.now());
  } catch {
    return null;
  }
}

// The answer on this page, so a browser that blocks storage still has it
let answer: Choice | null = null;
const waiting: (() => void)[] = [];

/** What may be done now, or null when the visitor has yet to be asked. A browser that says "do not track me" (Global
 *  Privacy Control) has answered no, unless the visitor says yes here */
export function consent(): Choice | null {
  const said = answer ?? saved();
  if (said) return said;
  if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl) return "denied";
  return document.documentElement.dataset.consent === "implied" ? "granted" : null;
}

/** Runs once the visitor agrees, or at once if they already have */
export function onConsent(run: () => void): void {
  if (consent() === "granted") run();
  else waiting.push(run);
}

/** Once per page: gtag.js writes its cookie again as the page unloads, so a yes taken back ends on the page after it */
export function enforceRefusal(): void {
  if (consent() === "denied") forgetCookies();
}

/** Saves the answer. Taking a yes back reloads the page: a script that already ran cannot be unloaded */
export function answerConsent(choice: Choice): void {
  const before = consent();
  answer = choice;
  try {
    localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() }));
  } catch {
    // storage blocked: the answer holds for this page
  }
  if (choice === "granted") {
    for (const run of waiting.splice(0)) run();
    return;
  }
  forgetCookies();
  if (before === "granted") location.reload();
}

/** The cookies that need a yes */
export const cookiesToForget = (header: string): string[] =>
  header.split(";").map((pair) => pair.split("=")[0].trim()).filter((name) => /^_ga(_.*)?$/.test(name));

function forgetCookies(): void {
  for (const name of cookiesToForget(document.cookie)) {
    for (const domain of ["", `; domain=${location.hostname}`, `; domain=.${location.hostname}`]) document.cookie = `${name}=; path=/; max-age=0${domain}`;
  }
}
