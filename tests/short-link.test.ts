// The short address of a reference (lib/short-link.ts): one code per reference and place, the same one however
// many times and however at once it is asked for, read back as the reference and its `?in=`, gone with the reference.
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { SHORT_CODE, resolveShort, shortCodeFor } from "@/lib/short-link";
import { cleanup, seed, type Fixture } from "./isolation/fixture";

let fx: Fixture;
beforeAll(async () => { fx = await seed(); });
afterAll(async () => {
  if (fx) {
    await db.delete(schema.shortLink).where(eq(schema.shortLink.itemId, fx.a.item));
    await cleanup(fx.tag);
  }
  await pool.end();
});

describe("short links", () => {
  test("a code is ten letters and digits and reads back as the reference and its place", async () => {
    const code = await shortCodeFor(fx.a.item, "inbox", fx.a.owner.id);
    expect(code).toMatch(SHORT_CODE);
    expect(await resolveShort(code)).toEqual({ itemId: fx.a.item, inside: "inbox" });
  });

  test("the same reference and place give the same code, even asked for at once", async () => {
    const codes = await Promise.all(Array.from({ length: 8 }, () => shortCodeFor(fx.a.item, "somewhere", fx.a.owner.id)));
    expect(new Set(codes).size).toBe(1);
    expect(await shortCodeFor(fx.a.item, "inbox", fx.a.owner.id)).not.toBe(codes[0]);
  });

  test("no place, or one that is not an id, is kept as none", async () => {
    const none = await shortCodeFor(fx.a.item, null, fx.a.owner.id);
    expect(await shortCodeFor(fx.a.item, "?x=<script>", fx.a.owner.id)).toBe(none);
    expect(await resolveShort(none)).toEqual({ itemId: fx.a.item, inside: "" });
  });

  test("what is not a code, or no code of ours, stands for nothing", async () => {
    expect(await resolveShort(fx.a.item)).toBeNull();
    expect(await resolveShort("0000000000")).toBeNull();
  });
});
