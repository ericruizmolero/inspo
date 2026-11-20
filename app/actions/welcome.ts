"use server";
// The first run (components/Welcome.tsx) keeps the step it reached, so a reload picks it up there (lib/welcome.ts).
// Away from Chrome, its extension step emails the install link to the person, to open on a computer.
import { withCtx } from "@/lib/workspace";
import { endWelcome, setWelcomeStep } from "@/lib/welcome";
import { WELCOME_STEPS, type WelcomeStep } from "@/lib/db/schema";
import { HttpError } from "@/lib/workspace-core";
import { getErrors } from "@/lib/i18n";
import { allow } from "@/lib/rate-limit";
import { extensionLinkMail, sendMail } from "@/lib/mail";
import { baseUrl } from "@/lib/notify";

/** Install links one person may email themselves in an hour */
const LINKS_PER_HOUR = 3;

/** The step reached, or null once Welcome ends */
export async function saveWelcomeStep(step: WelcomeStep | null) {
  return withCtx(async (ctx) => {
    const kept = step === null ? null : WELCOME_STEPS.find((s) => s === step);
    if (kept === undefined) throw new HttpError(400, (await getErrors()).badBody);
    if (kept === null) await endWelcome(ctx.user.id);
    else await setWelcomeStep(ctx.user.id, kept);
  });
}

/** Away from Chrome: the extension's install page, emailed to the person to open on a computer. Says where it went */
export async function emailExtensionLink() {
  return withCtx(async (ctx) => {
    if (!(await allow(`ext-link:${ctx.user.id}`, LINKS_PER_HOUR, 3_600_000))) throw new HttpError(429, (await getErrors()).tooMany);
    await sendMail(ctx.user.email, extensionLinkMail(`${baseUrl()}/extension/install`, ctx.user.language));
    return ctx.user.email;
  });
}
