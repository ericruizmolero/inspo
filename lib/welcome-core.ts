// Where the first run (components/Welcome.tsx) opens and picks up. user.welcome_step keeps the step reached while it
// is under way and goes back to null when it ends, so a reload lands on the same screen. Pure: the server reads it
// (lib/welcome.ts), the library decides with it, and tests/welcome.test.ts checks it.
import type { WelcomeStep } from "./db/schema";

export type { WelcomeStep };

/** The steps in order, the same on every device (WELCOME_STEPS in lib/db/schema.ts keeps the stored ones) */
export const WELCOME_ORDER: readonly WelcomeStep[] = ["name", "first", "extension", "agent"];

/** Welcome under way, as the server reads it: the step to show and the project it made, if it made one yet */
export interface WelcomeAt { step: WelcomeStep; project: string | null }

/**
 * What a step shows on this device. Every device walks the same four steps, so the one kept resumes anywhere; the
 * extension's step, where the extension cannot be installed (Safari, Firefox, a phone), says how to save without it
 * and offers the install link by email, to open on a computer with Chrome.
 */
export type StepView = WelcomeStep | "elsewhere";

export const viewOf = (step: WelcomeStep, installable: boolean): StepView => (step === "extension" && !installable ? "elsewhere" : step);

/** The step a kept one resumes at. The project's name is kept only by making the project, at the first reference: with
 *  no project yet, the name is asked again */
export function resumeStep(kept: WelcomeStep, hasProject: boolean): WelcomeStep {
  return kept === "first" && !hasProject ? "name" : kept;
}

/**
 * Whether the library opens on Welcome: while it is under way, or for a new account with nothing in it yet (the first
 * steps not hidden, no reference, no project). Arriving with a link pasted before signing up (?add=) opens it too: the
 * link becomes its first reference (arrivalFor).
 */
export function opensWelcome(o: { at: WelcomeAt | null; stepsOn: boolean; items: number; projects: number }): boolean {
  return o.at !== null || (o.stepsOn && o.items === 0 && o.projects === 0);
}

/** The ?add= link Welcome takes as its first reference: only while that step is still ahead. Further on, or with
 *  Welcome closed, it is null and the link saves itself as on any other visit (hooks/use-add-references.ts) */
export function arrivalFor(opens: boolean, step: WelcomeStep, add: string | null): string | null {
  return opens && (step === "name" || step === "first") && add ? add : null;
}
