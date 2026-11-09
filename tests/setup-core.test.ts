import { expect, test } from "vitest";
import { nextAction, setupState, type SetupFacts } from "@/lib/setup-core";
import { readBrief } from "@/types/brief";
import { NO_SKILLS, skillsOf } from "@/lib/md-skill-ids";

const brief = (v: Record<string, unknown>) => readBrief({ updatedAt: "2026-11-04", ...v });
const said = (text = "x") => ({ text, at: "2026-11-04" });
const empty: SetupFacts = { project: false, brief: null, brand: false, refs: 0, pass: false, picked: false, built: false };

test("each step waits for what closes it, in the path's order", () => {
  expect(setupState(empty).next).toBe("project");
  const project = { ...empty, project: true, brief: brief({}) };
  expect(setupState(project).next).toBe("source");
  expect(setupState({ ...project, brand: true }).next).toBe("questions");
  const withGoal = { ...project, brand: true, brief: brief({ answers: { goal: said() } }) };
  expect(setupState(withGoal).next).toBe("references");
  expect(setupState({ ...withGoal, refs: 1 }).next).toBe("criterio");
});

test("only goal stops the setup, and it is asked first", () => {
  const s = setupState({ ...empty, project: true, brand: true, brief: brief({ answers: { audience: said() } }) });
  expect(s.next).toBe("questions");
  expect(s.ask).toEqual(["goal", "first-seconds", "why-us", "proof", "wow", "piece-refs", "avoid"]);
  const t = setupState({ ...empty, project: true, brand: true, refs: 1, brief: brief({ answers: { goal: said() } }) });
  expect(t.next).toBe("criterio");
  expect(t.ask).toEqual(["audience", "first-seconds", "why-us", "proof", "wow", "piece-refs", "avoid"]);
});

test("an answer the agent read or brought is not the person's until confirmed, and is confirmed, never asked again", () => {
  const read = { ...said(), source: "read", from: "https://acme.com" };
  const brought = { ...said(), source: "agent", origin: "Prospecting chat" };
  const s = setupState({ ...empty, project: true, brand: true, brief: brief({ answers: { goal: read, offer: read, audience: brought } }) });
  expect(s.next).toBe("questions");
  expect(s.ask).not.toContain("goal");
  expect(s.ask).not.toContain("audience");
  expect(s.confirm).toEqual(["goal", "offer", "audience"]);
});

test("source and references can be skipped, and a brand needs no references", () => {
  const skipped = brief({ answers: { goal: said() }, skipped: ["references", "source"] });
  const s = setupState({ ...empty, project: true, brief: skipped });
  expect(s.next).toBe("criterio");
  expect(s.steps.find((x) => x.key === "references")!.state).toBe("skipped");
});

test("the questions and the criterio cannot be skipped", () => {
  const s = setupState({ ...empty, project: true, brand: true, refs: 3, brief: brief({ skipped: ["questions", "criterio"] }) });
  expect(s.next).toBe("questions");
  expect(s.complete).toBe(false);
});

test("the criterio completes the setup, and the landing is only offered", () => {
  const base = { ...empty, project: true, brand: true, refs: 1, pass: true, brief: brief({ answers: { goal: said() } }) };
  const s = setupState(base);
  expect(s.complete).toBe(true);
  expect(s.next).toBe("direction");
  expect(nextAction(s, 1)).toContain("nothing is unfinished");
  expect(nextAction(s, 1)).toContain("read_reference");
  expect(nextAction({ ...s }, 0), "building asks for references, the setup does not").toContain("ask first for 2 or 3 landing pages");
  expect(setupState({ ...base, picked: true }).next).toBe("landing");
  expect(setupState({ ...base, picked: true, built: true }).next).toBeNull();
});

test("a file starts with copy on, a list saved before keeps what its skills became, and off stays off", () => {
  expect(skillsOf(null)).toEqual(["copy"]);
  expect(skillsOf({})).toEqual(["copy"]);
  expect(skillsOf({ skills: "gsap,no-ai-slop,microcopy,icons" })).toEqual(["gsap", "copy"]);
  expect(skillsOf({ skills: NO_SKILLS })).toEqual([]);
});
