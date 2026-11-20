"use server";
// The first run (components/Welcome.tsx) keeps the step it reached, so a reload picks it up there (lib/welcome.ts).
import { withCtx } from "@/lib/workspace";
import { setWelcomeStep } from "@/lib/welcome";
import { WELCOME_STEPS, type WelcomeStep } from "@/lib/db/schema";
import { HttpError } from "@/lib/workspace-core";
import { getErrors } from "@/lib/i18n";

/** The step reached, or null once Welcome ends */
export async function saveWelcomeStep(step: WelcomeStep | null) {
  return withCtx(async (ctx) => {
    const kept = step === null ? null : WELCOME_STEPS.find((s) => s === step);
    if (kept === undefined) throw new HttpError(400, (await getErrors()).badBody);
    await setWelcomeStep(ctx.user.id, kept);
  });
}
