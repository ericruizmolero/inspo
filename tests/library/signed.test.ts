import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "@/lib/db";
import { loadPage } from "@/lib/library";
import { applyPage, type Mirror } from "@/lib/library-mirror";
import { webKeyOf } from "@/lib/url";
import * as storage from "@/lib/storage";
import { addItems, cleanupTeam, seedTeam, type Team } from "./seed";

let a: Team, b: Team;
beforeAll(async () => { [a, b] = await Promise.all([seedTeam(), seedTeam()]); });
afterAll(async () => { await Promise.all([a, b].filter(Boolean).map(cleanupTeam)); await pool.end(); });

const thumbOf = (t: Team) => `/api/files/inspo/${t.ws.id}/thumbs/given.png`;
const imageOf = (t: Team) => `/api/files/inspo/${t.ws.id}/media/upload.png`;

/** A reference with a thumbnail someone gave it, and an uploaded image */
async function seed(t: Team) {
  const [withThumb] = await addItems(t, 1);
  await db.update(schema.inspoItem).set({ thumbnailUrl: thumbOf(t) }).where(eq(schema.inspoItem.id, withThumb));
  const now = new Date(), web = imageOf(t);
  await db.insert(schema.inspoItem).values({
    id: `${t.tag}-image`, organizationId: t.ws.id, name: "upload", web, webKey: webKeyOf(web), date: now.toISOString().slice(0, 10),
    author: t.user.name, createdBy: t.user.id, note: "", tagStatus: "done", createdAt: now, updatedAt: now,
  });
}

test("a page carries signed links for its own thumbnails and uploaded images, and none of another workspace's", async () => {
  await Promise.all([seed(a), seed(b)]);
  const sign = vi.spyOn(storage, "signedFileUrl").mockImplementation(async (key) => ({ url: `https://bucket.test/${key}?sig`, maxAge: 3600 }));
  try {
    const page = await loadPage(a.ws.id, null);
    expect(page.signed[thumbOf(a)]).toBe(`https://bucket.test/inspo/${a.ws.id}/thumbs/given.png?sig`);
    expect(page.signed[imageOf(a)]).toBe(`https://bucket.test/inspo/${a.ws.id}/media/upload.png?sig`);
    expect(Object.keys(page.signed).filter((p) => p.includes(b.ws.id))).toEqual([]);
    // The paths stay the stored ones: other code reads them
    expect(page.thumbnailMap[page.items.find((i) => i.id === `${a.tag}-0`)!.web]).toBe(thumbOf(a));

    const empty: Mirror = { items: [], thumbnailMap: {}, tagMap: {}, tagJobs: {}, pageShots: {}, designMdIndex: {}, signed: {}, comments: {} };
    expect(applyPage(empty, page).signed[imageOf(a)]).toBe(page.signed[imageOf(a)]);
  } finally {
    sign.mockRestore();
  }
});

test("on disk nothing is signed and the board keeps the paths", async () => {
  const page = await loadPage(a.ws.id, null);
  expect(page.signed).toEqual({});
});
