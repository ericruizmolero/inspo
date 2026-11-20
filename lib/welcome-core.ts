// Where the first run (components/Welcome.tsx) opens and picks up. user.welcome_step keeps the step reached while it
// is under way and goes back to null when it ends, so a reload lands on the same screen. Pure: the server reads it
// (lib/welcome.ts), the library decides with it, and tests/welcome.test.ts checks it.
import type { WelcomeStep } from "./db/schema";

export type { WelcomeStep };

/** Welcome under way, as the server reads it: the step to show and the project it made, if it made one yet */
export interface WelcomeAt { step: WelcomeStep; project: string | null }

/** The steps this device shows, in order: the extension only where it can be installed (Chrome on a computer) */
export function stepsFor(installable: boolean): WelcomeStep[] {
  return installable ? ["name", "first", "extension", "agent"] : ["name", "first", "agent"];
}

/** The step a kept one resumes at. The project's name is kept only by making the project, at the first reference: with
 *  no project yet, the name is asked again */
export function resumeStep(kept: WelcomeStep, hasProject: boolean): WelcomeStep {
  return kept === "first" && !hasProject ? "name" : kept;
}

/** The step shown: one this device skips (the extension away from Chrome) gives way to the next one it shows */
export function shownStep(step: WelcomeStep, steps: readonly WelcomeStep[]): WelcomeStep {
  if (steps.includes(step)) return step;
  const all = stepsFor(true);
  return all.slice(all.indexOf(step)).find((s) => steps.includes(s)) ?? steps[steps.length - 1];
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
