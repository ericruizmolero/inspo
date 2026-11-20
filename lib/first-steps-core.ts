// The path from signing up to an AI client that reads the person's references, as data: what is done comes from rows
// the app already writes (lib/first-steps.ts), never from a checklist of its own. Shared by the server and the list
// on screen. It follows what the product says of itself (save, polish, connect: Eric, 20-11); the system is the
// team's own view and no step goes through it.

/** How far a workspace is along the path, for the person looking */
export interface FirstSteps {
  /** The project the next steps happen in: the one with the most references of its own; null with no project yet */
  project: string | null;
  /** References filed in that project, a template's left out */
  refs: number;
  /** Somebody voted on that project's board in Polish */
  polished: boolean;
  /** An AI client was connected over MCP (or, for the team, criterio.md was copied, downloaded or shared by link) */
  out: boolean;
}

export const REFS_GOAL = 3;

export type StepKey = "project" | "refs" | "polish" | "out";

/** In the order they are asked for. The step to do is the first one not done; any can be done before its turn */
export const STEPS: readonly { key: StepKey; done: (s: FirstSteps) => boolean; /** Where it is done */ href: (s: FirstSteps) => string }[] = [
  { key: "project", done: (s) => s.project !== null, href: () => "/?in=home" },
  { key: "refs", done: (s) => s.refs >= REFS_GOAL, href: projectHref },
  { key: "polish", done: (s) => s.polished, href: (s) => s.project ? `${projectHref(s)}&view=polish` : projectHref(s) },
  // Connecting is a dialog, opened in place by whoever shows the step (FirstStepsPath, the home's Tino)
  { key: "out", done: (s) => s.out, href: projectHref },
];

function projectHref(s: FirstSteps): string {
  return s.project ? `/?in=${encodeURIComponent(s.project)}` : "/?in=home";
}

/** The step to do now, or null when the path is walked */
export function nextStep(s: FirstSteps): StepKey | null {
  return STEPS.find((x) => !x.done(s))?.key ?? null;
}
