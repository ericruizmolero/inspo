// Shows the notice of CookieNotice.astro to a visitor who has to be asked, or who opens it again from the footer
// (CookieLink.astro), and passes the answer on
import { answerConsent, consent, type Choice } from "./consent";

function show(): HTMLElement | null {
  const open = document.getElementById("cookies");
  if (open) return open;
  const template = document.getElementById("cookies-template");
  if (!(template instanceof HTMLTemplateElement)) return null;
  // first in the page: a keyboard meets it before anything else, and it never traps the focus
  document.body.prepend(template.content.cloneNode(true));
  return document.getElementById("cookies");
}

export function setUpCookieNotice(): void {
  // opened on purpose: what opened it gets the focus back
  let opener: HTMLElement | null = null;
  document.addEventListener("click", ({ target }) => {
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLElement>("[data-cookie-settings]");
    if (link) {
      opener = link;
      show()?.focus({ preventScroll: true });
      return;
    }
    const answer = target.closest<HTMLElement>("[data-cookie-answer]");
    if (!answer) return;
    document.getElementById("cookies")?.remove();
    opener?.focus({ preventScroll: true });
    opener = null;
    answerConsent(answer.dataset.cookieAnswer as Choice);
  });
  if (consent() === null) show();
}
