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

test("changes of the same person minutes apart are one version until the file leaves", async () => {
  const a = { organizationId: fx.a.team, projectId: fx.a.project, ...at };
  const V = schema.criterioVersion;
  const rows = () => db.select({ n: V.n, via: V.via, exported: V.exported, byName: V.byName }).from(V).where(eq(V.projectId, fx.a.project)).orderBy(V.n);
  const owner = { id: fx.a.owner.id, name: fx.a.owner.name };
  const decide = (area: string, words: string) => decideArea(fx.a.team, fx.a.project, area, { decision: `${words} ${fx.tag}` }, owner);
  await db.delete(V).where(eq(V.projectId, fx.a.project));
  const t0 = Date.now();

  await decide("color", "Ink on paper");
  expect(await recordVersion({ ...a, via: "edit", byName: owner.name, now: new Date(t0) })).toBe(1);
  await decide("color", "Ink on warm paper");
  expect(await recordVersion({ ...a, via: "edit", byName: owner.name, now: new Date(t0 + 60_000) }), "a minute later, same person: the same version, rewritten").toBe(1);
  expect(await rows()).toEqual([{ n: 1, via: "edit", exported: false, byName: owner.name }]);

  // Leaving unchanged only marks it: what someone got is never rewritten after
  expect(await recordVersion({ ...a, via: "copy", byName: owner.name, now: new Date(t0 + 90_000) })).toBe(1);
  expect((await rows())[0].exported).toBe(true);
  await decide("motion", "Short and quiet");
  expect(await recordVersion({ ...a, via: "edit", byName: owner.name, now: new Date(t0 + 120_000) }), "after it left, a change is a new version").toBe(2);

  // An agent's write, under another name, is its own version; and so is the same person's change after the window
  await decide("motion", "Short, quiet, no bounce");
  expect(await recordVersion({ ...a, via: "mcp-write", viaName: "Claude", byName: "Someone else", now: new Date(t0 + 150_000) })).toBe(3);
  await decide("motion", "Short, quiet, no bounce, no parallax");
  expect(await recordVersion({ ...a, via: "mcp-write", viaName: "Claude", byName: "Someone else", now: new Date(t0 + 150_000 + 6 * 60_000) }), "six minutes later: a new one").toBe(4);
  expect((await rows()).map((r) => [r.n, r.via, r.exported])).toEqual([[1, "edit", true], [2, "edit", false], [3, "mcp-write:Claude", false], [4, "mcp-write:Claude", false]]);
  expect(await recordVersion({ ...a, via: "edit", byName: owner.name }), "nothing changed: no version").toBe(4);
});

test("another workspace's project carries no number", async () => {
  expect(await currentVersion({ organizationId: fx.b.team, projectId: fx.a.project, ...at })).toBeNull();
});
