import { afterAll, beforeAll, expect, test } from "vitest";
import { db, pool, schema } from "@/lib/db";
import { getSystem, loadSystemSummaries } from "@/lib/system";
import { summaryOf } from "@/types/system";
import { addItems, cleanupTeam, seedTeam, type Team } from "./seed";

let team: Team;
beforeAll(async () => { team = await seedTeam(); });
afterAll(async () => { if (team) await cleanupTeam(team); await pool.end(); });

test("the library's system summary carries no run, file, brand, takes, why or curation, and agrees with the whole system", async () => {
  const [a, b] = await addItems(team, 2);
  const now = new Date(), p = `${team.tag}-p`;
  const heavy = `${team.tag}-heavy`;
  await db.insert(schema.project).values({ id: p, organizationId: team.ws.id, name: "p", createdBy: team.user.id, createdAt: now, updatedAt: now });
  await db.insert(schema.projectSystem).values({
    projectId: p, organizationId: team.ws.id, summary: heavy, createdAt: now, updatedAt: now,
    runJson: { itemIds: [a, b], stamp: heavy, model: heavy, at: now.toISOString(), omitted: 1 },
    doc: { head: heavy }, brand: { voice: heavy },
  });
  await db.insert(schema.systemArea).values({
    projectId: p, organizationId: team.ws.id, area: "color", decision: "warm", confidence: 80, source: "team", decidedBy: team.user.id,
    evidence: [{ itemId: a, take: heavy }], why: heavy, curationJson: { candidates: [], verdicts: [], model: heavy, at: now.toISOString() },
    support: [{ signal: heavy, itemIds: [a], of: 2 }], updatedAt: now,
  });

  const summaries = await loadSystemSummaries(team.ws.id);
  const s = summaries[p];
  expect(JSON.stringify(summaries)).not.toContain(heavy);
  expect(Object.keys(s).sort()).toEqual(["areas", "projectId", "read"]);
  expect(s.read).toEqual({ itemIds: [a, b], omitted: 1 });
  expect(s.areas.find((x) => x.area === "color")).toEqual({ area: "color", decided: true, evidence: [a] });
  expect(s.areas.filter((x) => x.decided)).toHaveLength(1);
  expect(s).toEqual(summaryOf(await getSystem(team.ws.id, p)));
});
