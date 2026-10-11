import { afterAll, beforeAll, expect, test } from "vitest";
import { randomBytes } from "node:crypto";
import { db, pool, schema } from "@/lib/db";
import { brandChain, hadSystemPass, quotaStatus } from "@/lib/quota";
import { systemPassRef } from "@/lib/usage-core";
import { cleanupTeam, seedTeam, type Team } from "./seed";

let team: Team;
beforeAll(async () => { team = await seedTeam(); });
afterAll(async () => { if (team) await cleanupTeam(team); await pool.end(); });

const pass = (ref: string, action: "system" | "brand" = "system") => db.insert(schema.aiUsage).values({
  id: `${team.tag}-u-${randomBytes(3).toString("hex")}`, organizationId: team.ws.id, userId: team.user.id,
  action, model: "test", ref, createdAt: new Date(),
});

test("the account's first system pass is free, the brand pass chains to it, and the next one counts", async () => {
  const p = `${team.tag}-p`;
  await pass(systemPassRef(p, { auto: true, countedBefore: false }));
  expect(await hadSystemPass(team.ws.id)).toBe(false);

  await pass(systemPassRef(p, { auto: false, countedBefore: await hadSystemPass(team.ws.id) }));
  expect((await quotaStatus(team.ws)).ai.used).toBe(0);
  expect(await hadSystemPass(team.ws.id)).toBe(true);
  expect((await brandChain(team.ws.id, p)).systemAt).not.toBeNull();

  await pass(systemPassRef(p, { auto: false, countedBefore: await hadSystemPass(team.ws.id) }));
  expect((await quotaStatus(team.ws)).ai.used).toBe(1);
});
