// The path from nothing to a criterio.md, and on to a landing, as data: what is done comes from rows the app already
// writes (lib/setup.ts), never from a checklist of its own. Every surface asks this one function what comes next: the
// connector, the file's Start here and the app. Pure, so the browser can use it too.
import { PLAYBOOK_QUESTIONS, SETUP_ROLES, openQuestions } from "./playbook-questions";
import { unconfirmed, type Brief } from "@/types/brief";
import { sectionFilled, type BrandSpec } from "@/types/brand";
import type { ProjectSystem } from "@/types/system";

/** A brand was brought in when it holds these: the other sections can read filled from the project alone */
export const brandBrought = (brand: BrandSpec | null | undefined) => !!brand && (["logo", "color", "typography"] as const).some((k) => sectionFilled(brand, k));

export const SETUP_KEYS = ["project", "source", "questions", "references", "criterio"] as const;
export type SetupKey = (typeof SETUP_KEYS)[number];
/** Offered once the setup is complete, and never required: someone can keep a brand for the team and stop there */
export const BUILD_KEYS = ["direction", "landing"] as const;
export type BuildKey = (typeof BUILD_KEYS)[number];
/** The steps a person may decline */
export const SKIPPABLE: readonly SetupKey[] = ["source", "references"];

export const picked = (s: Pick<ProjectSystem, "learned">) => !!s.learned?.some((l) => l.pick);
export const built = (s: Pick<ProjectSystem, "outlines">) => !!s.outlines?.some((o) => o.built);

export interface SetupFacts {
  project: boolean;
  brief: Brief | null;
  /** The project holds brand values, or a reference marked as the client's site */
  brand: boolean;
  refs: number;
  /** References an agent brought that wait on the board for the team's yes or no (types/suggestions.ts) */
  suggested?: number;
  /** A pass wrote the project's criterio.md */
  pass: boolean;
  picked: boolean;
  built: boolean;
}

export interface SetupState {
  steps: { key: SetupKey | BuildKey; state: "done" | "open" | "skipped" }[];
  /** The next step; a build step only as an offer, once `complete` */
  next: SetupKey | BuildKey | null;
  /** The setup's own steps are done: the project has its criterio.md */
  complete: boolean;
  /** Questions to ask now, the one that stops first */
  ask: string[];
  /** Answers an agent read or brought and the person has not confirmed: shown once, as one list, never asked again */
  confirm: string[];
}

const answered = (brief: Brief | null, id: string) => {
  const a = brief?.answers?.[id];
  if (a) return !unconfirmed(a);
  return !openQuestions(brief, new Set()).some((q) => q.id === id);
};

export function setupState(f: SetupFacts): SetupState {
  const skipped = new Set(f.brief?.skipped ?? []);
  const asked = PLAYBOOK_QUESTIONS.filter((q) => SETUP_ROLES[q.id] === "stops" || SETUP_ROLES[q.id] === "core");
  const stopsDone = asked.every((q) => SETUP_ROLES[q.id] !== "stops" || answered(f.brief, q.id));
  const done: Record<SetupKey, boolean> = { project: f.project, source: f.brand, questions: stopsDone, references: f.refs > 0, criterio: f.pass };
  const steps: SetupState["steps"] = SETUP_KEYS.map((key) => ({ key, state: done[key] ? "done" : skipped.has(key) && SKIPPABLE.includes(key) ? "skipped" : "open" }));
  const complete = steps.every((s) => s.state !== "open");
  steps.push({ key: "direction", state: f.picked ? "done" : "open" }, { key: "landing", state: f.built ? "done" : "open" });
  const pending = (id: string) => unconfirmed(f.brief?.answers?.[id]);
  const ask = asked.filter((q) => !answered(f.brief, q.id) && !pending(q.id)).sort((a, b) => Number(SETUP_ROLES[b.id] === "stops") - Number(SETUP_ROLES[a.id] === "stops")).map((q) => q.id);
  const confirm = Object.entries(f.brief?.answers ?? {}).filter(([, a]) => unconfirmed(a)).map(([id]) => id);
  return { steps, next: steps.find((s) => s.state === "open")?.key ?? null, complete, ask, confirm };
}

/** What the agent does at each step, written for the model on the other end, in English */
const ACTIONS: Record<SetupKey | BuildKey, string> = {
  project: "Call list_projects. Pick the person's project, or create_project with what you know. Ask only for the name. Ask for the workspace only if the person is in several, as its own question, naming each one. Do not ask what the project is about: the setup finds that out.",
  source: "Look for a live site, tokens, fonts, logos or a brand guide. Show what you found in one list and ask one question: bring this in? After the yes, call bring_brand. With nothing to bring, or on a no, call start_setup with skip: \"source\".",
  questions: "Save what you read with answer_question and source \"read\". Show the answers in `confirm` once, as one list, and let the person confirm or correct them in one go: save each again with source \"person\" (or the person accepts them in the app). Never ask one of them again as a question. Then ask the questions in `ask`, one at a time. Only `goal` stops the setup: an unknown answer can stay open. Each thing the person says they never want to see (avoid) is also a rule: save it with record_learning, rejected: true. A reference they give for a piece (piece-refs) goes on the board with add_reference, a pasted picture through upload_link.",
  references: "Ask for landing pages the person likes, and what to take from each, in their words. Save each with add_reference and that note. References are optional: if the person only wants to keep the brand, call start_setup with skip: \"references\". For a new brand, say once that the file will be generic without them.",
  criterio: "Call run_pass. It writes the file from what is in the project. With no references or brand it stays thin, and that is fine: tell the person once, in a line, and go on.",
  direction: "The setup is complete. Offer to build a landing. On a no, stop here: nothing is unfinished. On a yes, build 2 heroes with the same copy and a different direction in type, layout, density or tone, never colour alone. With a brand brought in, differ in layout and density only. Ask which serves the goal better and why. Save the answer with record_learning, with section \"hero\", pick: true, what was rejected, and why. If it settles an area, also call propose_decision.",
  landing: "Call set_outline with the landing's goal and its sections in order. Each section's job says what it does for the goal: a section that does nothing for it is cut. Build section by section. When the landing exists, call set_outline again with built, and on a public address call check_landing and fix what it finds.",
};

/** A landing built without pictures of what the person likes comes out generic, whatever the model. The setup does not need
 *  them, since someone can only keep a brand, but building does */
const REFERENCES_FIRST = "The setup is complete. Offer to build a landing. On a no, stop here: nothing is unfinished. On a yes, ask first for 2 or 3 landing pages the person likes, what to take from each, and save them with add_reference: without references the result will be generic. If they still want to go on, say so once and continue.";
const MATERIAL_FIRST = "Before writing a line, gather the real material: call read_reference for each reference to see its picture, read the project's texts, and use the brand's own pictures, from measure_site or the repo. Real pictures and real words change the result more than anything else. ";

/** When an agent already brought references, the person reviews them in the app instead of being asked for more */
const REVIEW_FIRST = (n: number) => `${n === 1 ? "One reference an agent brought waits" : `${n} references an agent brought wait`} on the project's board for the team's yes or no. Tell the person, in a line, to accept or dismiss them in the app, and go on: do not ask for references while they wait.`;

export function nextAction(s: SetupState, refs: number, suggested = 0): string | null {
  if (!s.next) return null;
  if (s.next === "references" && suggested) return REVIEW_FIRST(suggested);
  if (s.next === "source" && suggested) return `${REVIEW_FIRST(suggested)} Then: ${ACTIONS.source}`;
  if (s.next === "direction") return refs ? MATERIAL_FIRST + ACTIONS.direction : REFERENCES_FIRST;
  return s.next === "landing" ? MATERIAL_FIRST + ACTIONS.landing : ACTIONS[s.next];
}
