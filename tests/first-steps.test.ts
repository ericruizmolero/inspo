import { expect, test } from "vitest";
import { REFS_GOAL, STEPS, nextStep, type FirstSteps } from "@/lib/first-steps-core";

const none: FirstSteps = { example: false, project: null, brief: false, refs: 0, system: false, out: false };
const all: FirstSteps = { example: true, project: "p1", brief: true, refs: REFS_GOAL, system: true, out: true };

test("the step to do is the first one not done, in the path's order", () => {
  expect(STEPS.map((s) => s.key)).toEqual(["example", "project", "brief", "refs", "system", "out"]);
  expect(nextStep(none)).toBe("example");
  expect(nextStep({ ...none, example: true })).toBe("project");
  expect(nextStep({ ...none, example: true, project: "p1" })).toBe("brief");
  expect(nextStep({ ...all, refs: REFS_GOAL - 1, system: false, out: false })).toBe("refs");
  expect(nextStep({ ...all, system: false })).toBe("system");
  expect(nextStep({ ...all, out: false })).toBe("out");
  expect(nextStep(all)).toBeNull();
});

test("a step skipped stays the one to do, whatever was done after it", () => {
  expect(nextStep({ ...all, example: false })).toBe("example");
  expect(nextStep({ ...all, brief: false })).toBe("brief");
});

test("each step links to where it is done, in the project the path follows", () => {
  const href = (key: string, s: FirstSteps) => STEPS.find((x) => x.key === key)!.href(s);
  expect(href("example", none)).toBe("/?in=templates");
  expect(href("project", none)).toBe("/?in=home");
  expect(href("brief", { ...all, refs: 0 })).toBe("/?in=p1");
  expect(href("brief", all)).toBe("/?in=p1&view=system&brief=1");
  expect(href("refs", all)).toBe("/?in=p1");
  expect(href("system", all)).toBe("/?in=p1&view=system");
  expect(href("refs", none)).toBe("/?in=home");
});
