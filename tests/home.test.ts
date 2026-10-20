import { expect, test } from "vitest";
import { homeActions, sortProjects } from "@/lib/home";
import type { InspoItem, Project } from "@/types/inspo";

const project = (id: string, name: string, createdAt?: string): Project => ({ id, name, createdAt });
const ref = (date: string): InspoItem => ({ name: "r", web: `https://${date}.example`, type: "inspiration", note: "", date, addedBy: "a" });

test("the inbox is offered only while it holds something, and the last project only when there is one", () => {
  const last = project("p1", "Landing");
  expect(homeActions(22, last)).toEqual([{ kind: "inbox", count: 22 }, { kind: "save" }, { kind: "continue", project: last }]);
  expect(homeActions(0, null)).toEqual([{ kind: "save" }]);
});

test("recent puts first the project touched last, by its newest reference or the day it was made", () => {
  const old = project("old", "Old", "2026-01-01T09:00:00Z");
  const fresh = project("fresh", "Fresh", "2026-10-19T09:00:00Z");
  const busy = project("busy", "Busy", "2026-02-01T09:00:00Z");
  const newest = { busy: [ref("20/10/2026")], old: [ref("05/03/2026")] };
  expect(sortProjects([old, busy, fresh], newest, "recent", "en").map((p) => p.id)).toEqual(["busy", "fresh", "old"]);
});

test("on the same day the project made later comes first, and one without a date counts as the oldest", () => {
  const a = project("a", "A", "2026-10-20T08:00:00Z");
  const b = project("b", "B", "2026-10-20T18:00:00Z");
  const undated = project("u", "U");
  expect(sortProjects([undated, a, b], {}, "recent", "en").map((p) => p.id)).toEqual(["b", "a", "u"]);
});

test("A to Z ignores case and accents and reads numbers as numbers", () => {
  const list = [project("1", "video 10"), project("2", "Ábaco"), project("3", "video 9"), project("4", "cozy")];
  expect(sortProjects(list, {}, "name", "es").map((p) => p.name)).toEqual(["Ábaco", "cozy", "video 9", "video 10"]);
});
