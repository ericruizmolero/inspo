// What the website may measure: the cookie answer (marketing-site/src/scripts/consent.ts), who is asked
// (worker/consent-regions.ts) and what reaches Google Analytics before and after a yes (scripts/analytics.ts).
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { asksFirst } from "@/marketing-site/worker/consent-regions";
import { cookiesToForget, parseAnswer } from "@/marketing-site/src/scripts/consent";
import { reportedReferrer, reportedUrl } from "@/marketing-site/src/scripts/analytics";

const DAY = 24 * 60 * 60 * 1000, at = 1000 * DAY;
const saved = (choice: unknown) => JSON.stringify({ choice, at });

test("an answer holds for six months, and anything we did not write is no answer", () => {
  expect(parseAnswer(saved("granted"), at + DAY)).toBe("granted");
  expect(parseAnswer(saved("denied"), at + 179 * DAY)).toBe("denied");
  expect(parseAnswer(saved("granted"), at + 181 * DAY)).toBeNull();
  for (const raw of [null, "", "granted", "{}", "null", saved("maybe"), '{"choice":"granted"}']) expect(parseAnswer(raw, at), String(raw)).toBeNull();
});

test("a no forgets Google Analytics' cookies and no other", () => {
  expect(cookiesToForget("_ga=GA1.1.2; lang=es; _ga_ABC123=GS2; _gat_x=1; criterio_x=1")).toEqual(["_ga", "_ga_ABC123"]);
});

test("the EU, the EEA, the UK, Switzerland and a country nobody can name are asked; the rest are not", () => {
  for (const c of ["ES", "FR", "NO", "GB", "CH", "RE", "XX", "T1", "", null, undefined]) expect(asksFirst(c), String(c)).toBe(true);
  for (const c of ["US", "MX", "AR", "JP"]) expect(asksFirst(c), c).toBe(false);
});

test("an address goes to Google with its campaign and nothing else", () => {
  expect(reportedUrl("https://criterio.design/es/?utm_source=x&landing&email=a@b.c&ref=joe#mail")).toBe("https://criterio.design/es/?utm_source=x&ref=joe");
  expect(reportedReferrer("https://criterio.design/?q=me", "https://criterio.design")).toBe("https://criterio.design/");
  expect(reportedReferrer("https://google.com/", "https://criterio.design")).toBe("https://google.com/");
});

// ─── A visit ─────────────────────────────────────────────────────────────────

const scripts: string[] = [];
let store: Record<string, string>, reload: ReturnType<typeof vi.fn<() => void>>;

function visit(o: { implied?: boolean; gpc?: boolean; hostname?: string } = {}) {
  vi.resetModules();
  scripts.length = 0;
  store = {};
  reload = vi.fn<() => void>();
  vi.stubGlobal("localStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
  vi.stubGlobal("navigator", { globalPrivacyControl: o.gpc });
  vi.stubGlobal("location", { hostname: o.hostname ?? "criterio.design", href: "https://criterio.design/", origin: "https://criterio.design", reload });
  vi.stubGlobal("document", {
    cookie: "", referrer: "", documentElement: { dataset: o.implied ? { consent: "implied" } : {} },
    createElement: () => ({}), head: { append: (s: { src: string }) => scripts.push(s.src) },
  });
  vi.stubGlobal("window", globalThis);
}
const modules = async () => ({ ...(await import("@/marketing-site/src/scripts/consent")), ...(await import("@/marketing-site/src/scripts/analytics")) });

beforeEach(() => visit());
afterEach(() => { vi.unstubAllGlobals(); delete (globalThis as { gtag?: unknown }).gtag; });

test("nothing is asked of Google, and no event leaves, before a yes; after it, gtag.js loads with ads off", async () => {
  const { consent, onConsent, answerConsent, startAnalytics, track } = await modules();
  expect(consent()).toBeNull();
  onConsent(startAnalytics);
  track("video_opened", {});
  expect(scripts).toEqual([]);
  expect((globalThis as { dataLayer?: unknown }).dataLayer).toBeUndefined();

  answerConsent("granted");
  expect(scripts).toHaveLength(1);
  expect(scripts[0]).toContain("googletagmanager.com/gtag/js");
  const sent = ((globalThis as { dataLayer?: IArguments[] }).dataLayer ?? []).map((a) => [...a]);
  expect(sent[0]).toEqual(["consent", "default", expect.objectContaining({ ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" })]);
  expect(JSON.stringify(sent), "what happened before the yes is dropped").not.toContain("video_opened");
  delete (globalThis as { dataLayer?: unknown }).dataLayer;
});

test("a no loads nothing, and a yes taken back reloads the page", async () => {
  const { consent, onConsent, answerConsent, startAnalytics } = await modules();
  onConsent(startAnalytics);
  answerConsent("denied");
  expect(scripts).toEqual([]);
  expect(reload).not.toHaveBeenCalled();
  answerConsent("granted");
  expect(consent()).toBe("granted");
  answerConsent("denied");
  expect(reload).toHaveBeenCalledOnce();
  delete (globalThis as { dataLayer?: unknown }).dataLayer;
});

test("outside the places that ask, yes is the default; Global Privacy Control is a no; another host is never measured", async () => {
  visit({ implied: true });
  expect((await modules()).consent()).toBe("granted");
  visit({ implied: true, gpc: true });
  expect((await modules()).consent()).toBe("denied");
  visit({ implied: true, hostname: "localhost" });
  (await modules()).startAnalytics();
  expect(scripts).toEqual([]);
});
