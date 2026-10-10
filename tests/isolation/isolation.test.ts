// A person of team B, against team A's data, on every surface in tests/isolation/surfaces.ts: each probe calls the
// real handler, action or tool and expects a refusal or nothing of A's.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { pool } from "@/lib/db";
import { actAs, reached } from "../harness";
import { cleanup, seed, type Fixture } from "./fixture";
import { SURFACES } from "./surfaces";

let fx: Fixture;

beforeAll(async () => { fx = await seed(); });
afterAll(async () => {
  if (fx) await cleanup(fx.tag);
  await pool.end();
});
beforeEach(() => { reached.length = 0; });
afterEach(() => actAs(null));

describe("team B gets nothing of team A", () => {
  for (const [id, surface] of Object.entries(SURFACES)) {
    if ("exempt" in surface) continue;
    test(id, async () => {
      await surface.probe(fx);
      expect(JSON.stringify(reached), "no outside call carries A's data").not.toContain(fx.a.prefix);
    });
  }
});
