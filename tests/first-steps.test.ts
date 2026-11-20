import { expect, test } from "vitest";
import { REFS_GOAL, STEPS, nextStep, type FirstSteps } from "@/lib/first-steps-core";

const none: FirstSteps = { project: null, refs: 0, polished: false, out: false };
const all: FirstSteps = { project: "p1", refs: REFS_GOAL, polished: true, out: true };

test("the step to do is the first one not done, in the path's order", () => {
  expect(STEPS.map((s) => s.key)).toEqual(["project", "refs", "polish", "out"]);
  expect(nextStep(none)).toBe("project");
  expect(nextStep({ ...none, project: "p1" })).toBe("refs");
  expect(nextStep({ ...all, refs: REFS_GOAL - 1, polished: false, out: false })).toBe("refs");
  expect(nextStep({ ...all, polished: false })).toBe("polish");
  expect(nextStep({ ...all, out: false })).toBe("out");
  expect(nextStep(all)).toBeNull();
});

test("a step skipped stays the one to do, whatever was done after it", () => {
  expect(nextStep({ ...all, project: null })).toBe("project");
  expect(nextStep({ ...all, refs: 0 })).toBe("refs");
});

test("each step links to where it is done, in the project the path follows", () => {
  const href = (key: string, s: FirstSteps) => STEPS.find((x) => x.key === key)!.href(s);
  expect(href("project", none)).toBe("/?in=home");
  expect(href("refs", all)).toBe("/?in=p1");
  expect(href("refs", none)).toBe("/?in=home");
  expect(href("polish", all)).toBe("/?in=p1&view=polish");
  expect(href("polish", none)).toBe("/?in=home");
  // No step goes through the system: it is the team's own view
  expect(STEPS.every((x) => !x.href(all).includes("view=system"))).toBe(true);
});
