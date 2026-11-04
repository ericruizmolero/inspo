import { afterEach, beforeEach, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { clientAskToken, clientAskView, submitClientAnswers } from "@/lib/client-ask";
import { readBrief } from "@/types/brief";
import { setupState } from "@/lib/setup-core";
import { setupFacts } from "@/lib/setup";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

let team: Team, project: string;
beforeEach(async () => {
  team = await seedTeam();
  project = `${team.tag}-project`;
  const now = new Date();
  await db.insert(schema.project).values({ id: project, organizationId: team.ws.id, name: "Acme", createdBy: team.user.id, createdAt: now, updatedAt: now });
});
afterEach(() => cleanupTeam(team));

const briefOf = async () => readBrief((await db.select({ b: schema.project.brief }).from(schema.project).where(eq(schema.project.id, project)))[0].b);

test("the link shows only the open questions, and asking twice gives the same address", async () => {
  const token = await clientAskToken(team.ws.id, project, team.user.id);
  expect(await clientAskToken(team.ws.id, project, team.user.id)).toBe(token);
  const view = await clientAskView(token, "en");
  expect(view!.project).toBe("Acme");
  expect(view!.questions.map((q) => q.id)).toEqual(["goal", "audience", "why-us", "proof"]);
  expect(Object.keys(view!)).toEqual(["project", "questions"]);
});

test("the client's answers are saved as theirs, and they close the goal", async () => {
  const token = await clientAskToken(team.ws.id, project, team.user.id);
  expect(await submitClientAnswers(token, { goal: "Book a demo", proof: "Forty clients" })).toBe("saved");
  const brief = await briefOf();
  expect(brief?.answers?.goal).toMatchObject({ text: "Book a demo", source: "client" });
  expect(setupState(await setupFacts(team.ws.id, project)).ask).toEqual(["audience", "why-us"]);
});

test("a link writes only open questions, never a field or an answered one, and only once", async () => {
  const token = await clientAskToken(team.ws.id, project, team.user.id);
  await submitClientAnswers(token, { goal: "First", about: "hacked", offer: "not open to it", "../x": "y" });
  const brief = await briefOf();
  expect(Object.keys(brief!.answers!)).toEqual(["goal"]);
  expect(brief!.about).toBe("");
  expect(await submitClientAnswers(token, { goal: "Second" })).toBe("gone");
  expect((await briefOf())!.answers!.goal.text).toBe("First");
  expect((await clientAskView(token, "en"))!.questions).toEqual([]);
});

test("a wrong token sees nothing and writes nothing", async () => {
  expect(await clientAskView("nope", "en")).toBeNull();
  expect(await clientAskView("a".repeat(22), "en")).toBeNull();
  expect(await submitClientAnswers("a".repeat(22), { goal: "x" })).toBe("gone");
});
