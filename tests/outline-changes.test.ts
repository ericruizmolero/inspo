import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/workspace-core", () => ({ HttpError: class extends Error { constructor(public status: number, m: string) { super(m); } } }));
import { changedSections } from "@/lib/outline-changes";

const s = (kind: string) => ({ kind, job: kind, refs: [] });
const plan = [s("hero"), s("problem"), s("proof"), s("cta")];
const kinds = (x: { kind: string }[]) => x.map((y) => y.kind);

describe("changedSections", () => {
  it("replaces one section and keeps the rest", () => {
    expect(kinds(changedSections(plan, [{ at: 2, section: s("how") }]))).toEqual(["hero", "how", "proof", "cta"]);
  });
  it("removes and inserts, each place read against the plan as given", () => {
    expect(kinds(changedSections(plan, [{ at: 2, remove: true }, { at: 3, insert: true, section: s("faq") }]))).toEqual(["hero", "faq", "proof", "cta"]);
  });
  it("adds at the end one past the last", () => {
    expect(kinds(changedSections(plan, [{ at: 5, insert: true, section: s("footer") }]))).toEqual(["hero", "problem", "proof", "cta", "footer"]);
  });
  it("refuses a place that is not there", () => {
    expect(() => changedSections(plan, [{ at: 9, section: s("x") }])).toThrow(/no section 9/);
  });
});
