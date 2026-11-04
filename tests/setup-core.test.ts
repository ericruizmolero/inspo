import { expect, test } from "vitest";
import { nextAction, setupState, type SetupFacts } from "@/lib/setup-core";
import { readBrief } from "@/types/brief";

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
  expect(s.ask).toEqual(["goal", "why-us", "proof"]);
  const t = setupState({ ...empty, project: true, brand: true, refs: 1, brief: brief({ answers: { goal: said() } }) });
  expect(t.next).toBe("criterio");
  expect(t.ask).toEqual(["audience", "why-us", "proof"]);
});

test("an answer the agent read is not the person's until confirmed", () => {
  const read = { ...said(), source: "read", from: "https://acme.com" };
  const s = setupState({ ...empty, project: true, brand: true, brief: brief({ answers: { goal: read, offer: read } }) });
  expect(s.next).toBe("questions");
  expect(s.ask[0]).toBe("goal");
  expect(s.confirm).toEqual(["goal", "offer"]);
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
  expect(nextAction(s)).toContain("nothing is unfinished");
  expect(setupState({ ...base, picked: true }).next).toBe("landing");
  expect(setupState({ ...base, picked: true, built: true }).next).toBeNull();
});
