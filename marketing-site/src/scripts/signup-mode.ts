// The waitlist forms and whether the app lets anyone in (app/api/access/mode, the switch in the app's /admin).
// While signup is invite-only the forms post to the waitlist. Once it is open, <html> gets .signup-open: each form
// shows its "Start free" key in place of the email field, and every link with data-open-href goes to the sign-in,
// labelled with its data-open-label. Shared by the home (waitlist.ts) and the full landing.
import { APP_URL } from "../i18n";

export const WAITLIST_URL = `${APP_URL}/api/waitlist`;

export const signupOpen = () => document.documentElement.classList.contains("signup-open");

fetch(`${APP_URL}/api/access/mode`)
  .then((r) => (r.ok ? r.json() : null))
  .then((body: { mode?: string } | null) => {
    if (body?.mode !== "open") return;
    document.documentElement.classList.add("signup-open");
    document.querySelectorAll<HTMLAnchorElement>("a[data-open-href]").forEach((a) => {
      a.href = a.dataset.openHref!;
      if (a.dataset.openLabel) a.textContent = a.dataset.openLabel;
    });
  })
  .catch(() => {});
