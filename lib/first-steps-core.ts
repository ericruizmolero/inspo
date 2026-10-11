// The path from signing up to the first criterio.md (#103), as data: what is done comes from rows the app already
// writes (lib/first-steps.ts), never from a checklist of its own. Shared by the server and the list on screen.

/** How far a workspace is along the path, for the person looking */
export interface FirstSteps {
  /** The person opened one of the Examples and saw its criterio.md */
  example: boolean;
  /** The project the next steps happen in: the one with the most references of its own; null with no project yet */
  project: string | null;
  /** That project says what it is (brief.about) */
  brief: boolean;
  /** References filed in that project, a template's left out */
  refs: number;
  /** That project had a system pass */
  system: boolean;
  /** criterio.md left the app: copied, downloaded, shared by link or read by an AI client over MCP */
  out: boolean;
}

export const REFS_GOAL = 10;

export type StepKey = "example" | "project" | "brief" | "refs" | "system" | "out";

/** In the order they are asked for. The step to do is the first one not done; any can be done before its turn */
export const STEPS: readonly { key: StepKey; done: (s: FirstSteps) => boolean; /** Where it is done */ href: (s: FirstSteps) => string }[] = [
  { key: "example", done: (s) => s.example, href: () => "/?in=templates" },
  { key: "project", done: (s) => s.project !== null, href: () => "/?in=home" },
  // An empty project opens on its start, which asks what it is; one with references has the brief in its system view
  { key: "brief", done: (s) => s.brief, href: (s) => s.refs ? `${projectHref(s)}&view=system&brief=1` : projectHref(s) },
  { key: "refs", done: (s) => s.refs >= REFS_GOAL, href: projectHref },
  { key: "system", done: (s) => s.system, href: (s) => `${projectHref(s)}&view=system` },
  { key: "out", done: (s) => s.out, href: (s) => `${projectHref(s)}&view=system` },
];

function projectHref(s: FirstSteps): string {
  return s.project ? `/?in=${encodeURIComponent(s.project)}` : "/?in=home";
}

/** The step to do now, or null when the path is walked */
export function nextStep(s: FirstSteps): StepKey | null {
  return STEPS.find((x) => !x.done(s))?.key ?? null;
}
