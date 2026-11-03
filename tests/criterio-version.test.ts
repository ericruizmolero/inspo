// The number criterio.md carries now (lib/criterio-versions.ts currentVersion): the page's head shows it, a result
// built from an older one is told apart by it, and what the next exit records is exactly that number.
import { afterAll, beforeAll, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { currentVersion, recordVersion } from "@/lib/criterio-versions";
import { decideArea } from "@/lib/system/areas";
import { cleanup, seed, type Fixture } from "./isolation/fixture";

let fx: Fixture;
beforeAll(async () => { fx = await seed(); });
afterAll(async () => {
  if (fx) {
    await db.delete(schema.criterioVersion).where(eq(schema.criterioVersion.projectId, fx.a.project));
    await cleanup(fx.tag);
  }
  await pool.end();
});

const at = { locale: "en" as const, origin: "http://127.0.0.1" };

test("the file's number is the one the next exit records, and stays while the file does", async () => {
  const a = { organizationId: fx.a.team, projectId: fx.a.project, ...at };
  await db.delete(schema.criterioVersion).where(eq(schema.criterioVersion.projectId, fx.a.project));
  expect(await currentVersion(a), "no version kept yet: the file is v1").toBe(1);
  expect(await recordVersion({ ...a, via: "copy", byName: fx.a.owner.name })).toBe(1);
  expect(await currentVersion(a), "copied and unchanged: still v1").toBe(1);
  expect(await recordVersion({ ...a, via: "download", byName: fx.a.owner.name }), "the same file is not kept twice").toBe(1);

  await decideArea(fx.a.team, fx.a.project, "voice", { decision: `Plain words, short lines ${fx.tag}` }, { id: fx.a.owner.id, name: fx.a.owner.name });
  expect(await currentVersion(a), "changed since v1: the next exit keeps v2").toBe(2);
  expect(await recordVersion({ ...a, via: "result", byName: fx.a.owner.name })).toBe(2);
  expect(await currentVersion(a)).toBe(2);
});

test("another workspace's project carries no number", async () => {
  expect(await currentVersion({ organizationId: fx.b.team, projectId: fx.a.project, ...at })).toBeNull();
});
