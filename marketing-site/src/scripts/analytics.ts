// The one way the website reports an event. The rest calls track() and knows nothing of the tool behind it.
//
// gtag.js is not asked for until the visitor agrees, so before that there is no window.gtag and track() does nothing:
// what happened before the yes is dropped, never queued.
import { GA_MEASUREMENT_ID, MEASURED_HOST } from "../measurement";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** What is measured, and the decision each one is for, is in the vault: "Criterio — Plan de medición". Never an email, a
 *  name or anything else that says who someone is: Google's terms forbid it and the privacy policy promises it */
export interface Events {
  waitlist_joined: { form: "hero" | "close" };
  video_opened: Record<string, never>;
  question_opened: { question: string };
  plans_cta_clicked: Record<string, never>;
}

export function track<E extends keyof Events>(event: E, params: Events[E]): void {
  window.gtag?.("event", event, params);
}

const KEPT_PARAMS = /^(utm_[a-z_]+|ref|via)$/;

/** An address without its private parts: only the campaign's parameters stay */
export function reportedUrl(href: string): string {
  const url = new URL(href);
  for (const name of [...url.searchParams.keys()]) if (!KEPT_PARAMS.test(name)) url.searchParams.delete(name);
  url.hash = "";
  return url.href;
}

/** Another site's address is already trimmed by its own referrer policy */
export const reportedReferrer = (referrer: string, origin: string): string => (referrer.startsWith(`${origin}/`) ? reportedUrl(referrer) : referrer);

export function startAnalytics(): void {
  if (location.hostname !== MEASURED_HOST || window.gtag) return;
  window.dataLayer = [];
  // gtag.js reads the arguments object itself; a rest array is ignored
  window.gtag = function () { window.dataLayer!.push(arguments); };
  window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  // `set`, and before `js`: the tag starts on its own when gtag.js loads and drops whatever comes in `config` (seen on
  // 25/11: whole addresses went out, with cookies on .criterio.design)
  window.gtag("set", {
    page_location: reportedUrl(location.href),
    page_referrer: reportedReferrer(document.referrer, location.origin),
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: "none",   // criterio.design alone: the app, on app.criterio.design, never receives it
    cookie_expires: 395 * 24 * 60 * 60,   // 13 months, as the privacy policy says
  });
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.append(script);
}

/** Every event, from what the page already announces: none of the pieces knows it is measured */
export function trackPage(): void {
  addEventListener("waitlist:joined", (e) => track("waitlist_joined", { form: (e.target as HTMLElement).id === "invite" ? "hero" : "close" }));
  addEventListener("video:opened", () => track("video_opened", {}));
  document.addEventListener("click", ({ target }) => {
    if (!(target instanceof Element)) return;
    const question = target.closest(".hq-keys button");
    if (question) track("question_opened", { question: question.textContent!.slice(0, 100) });
    if (target.closest(".pricing-foot .btn")) track("plans_cta_clicked", {});
  });
}
