import { afterAll, beforeAll, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { WELCOME_STEPS } from "@/lib/db/schema";
import { arrivalFor, opensWelcome, resumeStep, shownStep, stepsFor } from "@/lib/welcome-core";
import { welcomeAt } from "@/lib/welcome";
import { saveWelcomeStep } from "@/app/actions/welcome";
import { actAs } from "./harness";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

let team: Team;
beforeAll(async () => { team = await seedTeam(); });
afterAll(async () => { actAs(null); if (team) await cleanupTeam(team); await pool.end(); });

const fresh = { at: null, stepsOn: true, items: 0, projects: 0 };

test("Welcome opens for a new account with nothing in it, and whenever it is under way", () => {
  expect(opensWelcome(fresh)).toBe(true);
  expect(opensWelcome({ ...fresh, items: 1 })).toBe(false);
  expect(opensWelcome({ ...fresh, projects: 1 })).toBe(false);
  expect(opensWelcome({ ...fresh, stepsOn: false })).toBe(false);
  // Half way, a reload brings it back with the project and its first reference already there
  expect(opensWelcome({ at: { step: "agent", project: "p" }, stepsOn: true, items: 1, projects: 1 })).toBe(true);
  expect(opensWelcome({ at: { step: "extension", project: "p" }, stepsOn: false, items: 4, projects: 1 })).toBe(true);
});

test("a link pasted before signing up is the first reference while that step is still ahead", () => {
  const web = "https://linear.app";
  expect(arrivalFor(true, "name", web)).toBe(web);
  expect(arrivalFor(true, "first", web)).toBe(web);
  // Past it, or with Welcome closed, the link saves itself as on any other visit
  expect(arrivalFor(true, "extension", web)).toBeNull();
  expect(arrivalFor(true, "agent", web)).toBeNull();
  expect(arrivalFor(false, "name", web)).toBeNull();
  expect(arrivalFor(true, "name", null)).toBeNull();
});

test("a kept step resumes where it was, the name asked again when no project kept it", () => {
  expect(stepsFor(true)).toEqual([...WELCOME_STEPS]);
  expect(resumeStep("first", false)).toBe("name");
  expect(resumeStep("first", true)).toBe("first");
  expect(resumeStep("extension", true)).toBe("extension");
  expect(resumeStep("agent", false)).toBe("agent");
  // The extension away from Chrome gives way to the AI client; on Chrome it shows
  expect(shownStep("extension", stepsFor(false))).toBe("agent");
  expect(shownStep("extension", stepsFor(true))).toBe("extension");
  expect(shownStep("first", stepsFor(false))).toBe("first");
});

test("the step reached is kept on the person's row and read back with the project Welcome made", async () => {
  const me = { id: team.user.id, name: team.user.name, email: team.user.email, workspaceId: team.ws.id };
  const ws = team.ws.id, now = new Date();
  const step = async () => (await db.select({ s: schema.user.welcomeStep }).from(schema.user).where(eq(schema.user.id, me.id)))[0]?.s;
  expect(await welcomeAt(me.id, ws)).toBeNull();

  actAs(me);
  expect((await saveWelcomeStep("first")).ok).toBe(true);
  expect(await step()).toBe("first");
  // No project yet: the name it never kept is asked again
  expect(await welcomeAt(me.id, ws)).toEqual({ step: "name", project: null });

  // An example is never the project Welcome made
  const tpl = `${team.tag}-tpl`, example = `${team.tag}-ex`, mine = `${team.tag}-p`;
  await db.insert(schema.project).values({ id: tpl, organizationId: ws, name: "template", template: {}, createdAt: now, updatedAt: now });
  await db.insert(schema.project).values({ id: example, organizationId: ws, name: "example", fromTemplate: tpl, createdBy: me.id, createdAt: new Date(+now - 1000), updatedAt: now });
  expect(await welcomeAt(me.id, ws)).toEqual({ step: "name", project: null });
  await db.insert(schema.project).values({ id: mine, organizationId: ws, name: "mine", createdBy: me.id, createdAt: now, updatedAt: now });
  expect(await welcomeAt(me.id, ws)).toEqual({ step: "first", project: mine });

  expect((await saveWelcomeStep("agent")).ok).toBe(true);
  expect(await welcomeAt(me.id, ws)).toEqual({ step: "agent", project: mine });

  // A step that is not one is refused and changes nothing
  expect((await saveWelcomeStep("tour" as never)).ok).toBe(false);
  expect(await step()).toBe("agent");

  // The end gives it back: the library no longer opens on it
  expect((await saveWelcomeStep(null)).ok).toBe(true);
  expect(await welcomeAt(me.id, ws)).toBeNull();
});
