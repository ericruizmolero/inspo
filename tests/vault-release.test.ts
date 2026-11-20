// "New in the Vault" (lib/vault-release.ts): what a release holds, who gets it, that it goes out once however many
// partners press Send at the same moment, and that its stop link turns it off. Mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { pendingRelease, sendRelease, vaultReaders } from "@/lib/vault-release";
import { unsubscribeUrl, unsubscribeValid } from "@/lib/notify";
import { POST as unsubscribe } from "@/app/api/unsubscribe/route";
import { resubscribe } from "@/app/actions/notifications";
import { mailDict } from "@/lib/mail";

interface Sent { to: string[]; subject: string; text: string; headers?: Record<string, string> }
const sent: Sent[] = [];
vi.mock("@/lib/mail", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  sendMail: async (to: string | string[], m: { subject: string; text: string }, o: { headers?: Record<string, string> } = {}) => { sent.push({ to: [to].flat(), ...m, headers: o.headers }); },
}));

const tag = `vrel${randomBytes(4).toString("hex")}`;
const person = (who: string, language = "en") => ({ id: `${tag}-${who}`, name: `${tag} ${who}`, email: `${tag}-${who}@example.test`, language });
const paid = person("paid", "es"), muted = person("muted"), free = person("free"), inTeam = person("team"), partner = person("partner");
const people = [paid, muted, free, inTeam, partner];
const workspaces: string[] = [];
const entryIds: string[] = [];

/** A Vault entry published `ago` ms before now (null: never published) */
async function entry(name: string, ago: number | null = 0) {
  const id = newId();
  const now = Date.now();
  await db.insert(schema.vaultItem).values({ id, slug: `${tag}-${name}`, title: `${tag} ${name}`, category: "hero", summary: `What ${name} is`,
    es: { title: `${tag} ${name} es` }, publishedAt: ago === null ? null : new Date(now - ago), createdAt: new Date(now), updatedAt: new Date(now) });
  entryIds.push(id);
  return id;
}
const mine = (cards: { id: string }[]) => cards.map((c) => c.id).filter((id) => entryIds.includes(id));
const to = (p: { email: string }) => sent.filter((m) => m.to.includes(p.email));

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values(people.map((p) => ({ ...p, emailVerified: true, createdAt: now, updatedAt: now })));
  await db.update(schema.user).set({ vaultEmails: false }).where(eq(schema.user.id, muted.id));
  workspaces.push(
    await ensurePersonalWorkspace(paid.id, paid.name, paid.email, "es", "duo"),
    await ensurePersonalWorkspace(muted.id, muted.name, muted.email, "en", "studio"),
    await ensurePersonalWorkspace(free.id, free.name, free.email, "en"),
    await ensurePersonalWorkspace(inTeam.id, inTeam.name, inTeam.email, "en"),
    await ensurePersonalWorkspace(partner.id, partner.name, partner.email, "en"),
  );
  // Free in their own space, a member of a paid one: their Vault is whole
  await db.insert(schema.member).values({ id: newId(), organizationId: workspaces[0], userId: inTeam.id, role: "member", createdAt: now });
  await db.insert(schema.appAdmin).values({ email: partner.email, addedBy: "test", createdAt: now });
});

beforeEach(() => { sent.length = 0; });

afterAll(async () => {
  const ids = people.map((p) => p.id);
  await db.delete(schema.vaultRelease).where(inArray(schema.vaultRelease.sentBy, ids));
  await db.delete(schema.vaultItem).where(inArray(schema.vaultItem.id, entryIds));
  await db.delete(schema.organization).where(inArray(schema.organization.id, workspaces));
  await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, ids));
  await db.delete(schema.appAdmin).where(eq(schema.appAdmin.email, partner.email));
  await db.delete(schema.user).where(inArray(schema.user.id, ids));
});

test("a release reaches whoever reads the whole Vault and the partners, never a free account or someone who turned it off", async () => {
  const readers = (await vaultReaders()).map((r) => r.id);
  expect(readers, "a paid plan").toContain(paid.id);
  expect(readers, "free, but a member of a paid workspace").toContain(inTeam.id);
  expect(readers, "a partner on the free plan").toContain(partner.id);
  expect(readers, "a free account").not.toContain(free.id);
  expect(readers, "vault_emails off").not.toContain(muted.id);
});

test("pending is every published piece the last release did not reach, and a release sends each one once", async () => {
  const draft = await entry("draft", null);
  const a = await entry("a", 2000), b = await entry("b", 1000);
  expect(mine(await pendingRelease()), "published pieces, newest first, no draft").toEqual([b, a]);

  const release = await sendRelease(partner.id, { gapMs: 0 });
  expect(release?.pieces, "it carries what was pending").toBeGreaterThanOrEqual(2);
  const [row] = await db.select().from(schema.vaultRelease).where(eq(schema.vaultRelease.id, release!.id));
  expect(row.entryIds, "the release records its pieces").toEqual(expect.arrayContaining([a, b]));
  expect(row.entryIds).not.toContain(draft);
  expect(row.sentBy).toBe(partner.id);
  expect(mine(await pendingRelease()), "nothing of it is pending any more").toEqual([]);

  // In the reader's language, with each piece's line and its address in the app, and the stop link in the headers
  const [es] = to(paid);
  expect(to(paid), "one email per reader").toHaveLength(1);
  expect(es.subject).toBe(mailDict("es").vaultRelease.subject(release!.pieces));
  expect(es.text).toContain(`${tag} b es (Hero)`);
  expect(es.text).toContain(`What b is`);
  expect(es.text).toContain(`/?in=vault&entry=${tag}-b`);
  expect(es.text).toContain(mailDict("es").signature);
  expect(es.headers?.["List-Unsubscribe"]).toBe(`<${unsubscribeUrl(paid.id, "vault")}>`);
  expect(to(inTeam)[0].subject).toBe(mailDict("en").vaultRelease.subject(release!.pieces));
  expect(to(partner)).toHaveLength(1);
  expect(to(free), "a free account gets nothing").toEqual([]);
  expect(to(muted), "nor someone who turned it off").toEqual([]);

  sent.length = 0;
  expect(await sendRelease(partner.id, { gapMs: 0 }), "nothing pending sends nothing").toBeNull();
  expect(sent).toEqual([]);

  const c = await entry("c");
  expect(mine(await pendingRelease()), "a piece published after the release waits for the next").toEqual([c]);
});

test("two partners sending at the same moment mail each reader once", async () => {
  await entry("d");
  const both = await Promise.all([sendRelease(partner.id, { gapMs: 0 }), sendRelease(partner.id, { gapMs: 0 })]);
  expect(both.filter(Boolean), "only one of them sends").toHaveLength(1);
  expect(to(paid), "the reader gets it once").toHaveLength(1);
  expect(to(partner)).toHaveLength(1);
});

test("the stop link at the foot turns the releases off, and its page turns them back on", async () => {
  const link = new URL(unsubscribeUrl(paid.id, "vault"));
  const [u, k, s] = ["u", "k", "s"].map((x) => link.searchParams.get(x));
  expect(unsubscribeValid(u, k, s), "the link is signed for the vault kind").toBe(true);
  expect(unsubscribeValid(u, "digest", s), "and for no other").toBe(false);

  const res = await unsubscribe(new NextRequest(link, { method: "POST" }));
  expect(res.status).toBe(200);
  expect((await vaultReaders()).map((r) => r.id), "off: no more releases").not.toContain(paid.id);
  const [row] = await db.select({ digest: schema.user.digestEmails, vault: schema.user.vaultEmails }).from(schema.user).where(eq(schema.user.id, paid.id));
  expect(row, "only that kind changed").toEqual({ digest: true, vault: false });

  expect(await resubscribe(u!, k!, s!)).toBe(true);
  expect((await vaultReaders()).map((r) => r.id), "on again").toContain(paid.id);
});
