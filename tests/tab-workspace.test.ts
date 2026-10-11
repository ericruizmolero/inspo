// Each tab saves into the workspace it shows: the X-Workspace header it sends, not the session's active one,
// which another tab may have switched (issue #130).
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { newProject } from "@/app/actions/library";
import { GET as tags } from "@/app/api/tags/route";
import { actAs } from "./harness";
import { cleanup, seed, type Fixture } from "./isolation/fixture";

let fx: Fixture;

beforeAll(async () => { fx = await seed(); });
afterAll(async () => {
  if (fx) await cleanup(fx.tag);
  await pool.end();
});
afterEach(() => actAs(null));

const projectIn = async (name: string) =>
  (await db.select({ ws: schema.project.organizationId }).from(schema.project).where(and(eq(schema.project.name, name), eq(schema.project.createdBy, fx.a.owner.id)))).map((r) => r.ws);

test("a save goes to the tab's workspace while the session's active one is another", async () => {
  actAs(fx.a.owner, { "x-workspace": fx.a.personal });
  const r = await newProject(`${fx.tag} from the personal tab`);
  expect(r.ok).toBe(true);
  expect(await projectIn(`${fx.tag} from the personal tab`)).toEqual([fx.a.personal]);
});

test("without the header a save goes to the session's active workspace", async () => {
  actAs(fx.a.owner);
  expect((await newProject(`${fx.tag} with no header`)).ok).toBe(true);
  expect(await projectIn(`${fx.tag} with no header`)).toEqual([fx.a.team]);
});

test("a workspace the person is not in is refused with a 403, and nothing is written", async () => {
  actAs(fx.a.owner, { "x-workspace": fx.b.team });
  const r = await newProject(`${fx.tag} into B`);
  expect(r.ok).toBe(false);
  expect(await projectIn(`${fx.tag} into B`)).toEqual([]);
  const res = await tags(new NextRequest("http://localhost/api/tags?web=x"));
  expect(res.status).toBe(403);
});
