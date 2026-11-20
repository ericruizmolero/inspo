// Deleting an account from Settings, Account (lib/account-delete.ts, app/actions/account.ts): refused while a team of
// theirs has other people; otherwise their personal space and solo teams go, they leave the rest, their empty billing
// accounts go, one email goes out, and the user row goes. Mail is recorded, never sent.
import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { createBillingAccount, ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { deleteAccount, spacesOnDelete } from "@/lib/account-delete";
import { firstTime } from "@/lib/mail-once";
import { deleteMyAccount } from "@/app/actions/account";
import { actAs, reached, type Actor } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached } = await import("./harness");
  return { ...(await importOriginal<object>()), sendMail: async (to: string | string[], m: { subject: string }) => { reached.push(["mail", { to: [to].flat(), subject: m.subject }]); } };
});

const tag = `adel${randomBytes(4).toString("hex")}`;
const O = schema.organization, M = schema.member, B = schema.billingAccount, U = schema.user;
const users: string[] = [], orgs: string[] = [];
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as { to: string[]; subject: string });

async function user(who: string): Promise<Actor> {
  const id = `${tag}-${who}`, email = `${id}@example.test`, now = new Date();
  await db.insert(U).values({ id, name: `${tag} ${who}`, email, emailVerified: true, createdAt: now, updatedAt: now });
  users.push(id);
  const workspaceId = await ensurePersonalWorkspace(id, `${tag} ${who}`, email, "en");
  orgs.push(workspaceId);
  return { id, name: `${tag} ${who}`, email, workspaceId };
}

/** A team on its own billing account, owned by `owner`, with `others` as members */
async function team(name: string, owner: Actor, others: Actor[] = []): Promise<{ id: string; accountId: string }> {
  const id = newId(), now = new Date();
  const accountId = await createBillingAccount({ name: `${tag}-${name}`, ownerUserId: owner.id });
  await db.insert(O).values({ id, name: `${tag}-${name}`, slug: `${tag}-${name}`, createdAt: now, kind: "team", billingAccountId: accountId });
  await db.insert(M).values([owner, ...others].map((p, i) => ({ id: newId(), organizationId: id, userId: p.id, role: i ? "member" : "owner", createdAt: now })));
  orgs.push(id);
  return { id, accountId };
}

const exists = async (table: typeof O | typeof B | typeof U, id: string) => (await db.select({ id: table.id }).from(table).where(eq(table.id, id))).length > 0;
const personalAccountOf = async (orgId: string) => (await db.select({ id: O.billingAccountId }).from(O).where(eq(O.id, orgId)))[0].id;

let me: Actor, host: Actor, mate: Actor;
let solo: { id: string; accountId: string }, shared: { id: string; accountId: string }, hosted: { id: string; accountId: string };
let emptyAccount = "", personalAccount = "";

beforeAll(async () => {
  [me, host, mate] = [await user("me"), await user("host"), await user("mate")];
  solo = await team("solo", me);
  shared = await team("shared", me, [mate]);
  hosted = await team("hosted", host, [me, mate]);
  emptyAccount = await createBillingAccount({ name: `${tag}-empty`, ownerUserId: me.id });
  personalAccount = await personalAccountOf(me.workspaceId);
});

beforeEach(() => { reached.length = 0; });

afterAll(async () => {
  actAs(null);
  await db.delete(O).where(inArray(O.id, orgs));
  await db.delete(B).where(inArray(B.ownerUserId, users));
  await db.delete(U).where(inArray(U.id, users));
  await db.delete(schema.appSetting).where(eq(schema.appSetting.key, `account-deleted:${me.id}`));
});

test("each space has its fate: the personal one and solo teams go, others' teams are left, a shared team of theirs blocks", async () => {
  const fates = Object.fromEntries((await spacesOnDelete(me.id)).map((s) => [s.id, s.fate]));
  expect(fates).toEqual({ [me.workspaceId]: "delete", [solo.id]: "delete", [shared.id]: "blocks", [hosted.id]: "leave" });
});

test("while a team of theirs has other people, the delete is refused with the reason and nothing is touched", async () => {
  actAs(me);
  const r = await deleteMyAccount();
  expect(r.ok).toBe(false);
  expect(!r.ok && r.error).toBe(`You own ${tag}-shared, with other people in it. Delete it or hand it over in Workspace first.`);
  for (const id of [me.workspaceId, solo.id, shared.id]) expect(await exists(O, id), "every space is still there").toBe(true);
  expect(await exists(U, me.id)).toBe(true);
  expect(mails(), "no email goes out").toEqual([]);
});

test("a retry after a crash finishes the job: spaces gone, others' teams left, billing cleaned, one email, the user gone", async () => {
  // The first run got as far as the email and stopped: the solo team is gone and the email was sent
  await db.delete(M).where(eq(M.organizationId, shared.id));
  await db.delete(O).where(eq(O.id, shared.id));
  const { deleteWorkspace } = await import("@/lib/workspace-delete");
  await deleteWorkspace(solo.id);
  expect(await firstTime(`account-deleted:${me.id}`)).toBe(true);

  actAs(me);
  await expect(deleteMyAccount(), "done, the browser goes to /login").rejects.toMatchObject({ kind: "redirect", url: "/login" });
  expect(await exists(U, me.id), "the user row is gone").toBe(false);
  expect(await exists(O, me.workspaceId), "the personal space is gone").toBe(false);
  expect(await exists(O, solo.id), "the solo team is gone").toBe(false);
  expect(await exists(O, hosted.id), "the host's team stays").toBe(true);
  const left = await db.select({ userId: M.userId }).from(M).where(eq(M.organizationId, hosted.id));
  expect(left.map((m) => m.userId).sort(), "they left it; the others are still in").toEqual([host.id, mate.id].sort());
  for (const id of [personalAccount, solo.accountId, emptyAccount]) expect(await exists(B, id), "their empty billing accounts are gone").toBe(false);
  expect(await exists(B, hosted.accountId), "the host's account stays").toBe(true);
  expect(mails(), "the email was already sent: not again").toEqual([]);

  expect(await deleteAccount(me.id), "run again, there is nothing left to do").toEqual({ files: 0, storageClean: true });
});

test("a person with nothing in the way is deleted in one go, with the email", async () => {
  const lone = await user("lone");
  const own = await team("own", lone);
  const account = await personalAccountOf(lone.workspaceId);
  expect(await deleteAccount(lone.id)).toMatchObject({ storageClean: true });
  expect(mails()).toEqual([{ to: [lone.email], subject: "Your account is deleted" }]);
  for (const [t, id] of [[U, lone.id], [O, lone.workspaceId], [O, own.id], [B, account], [B, own.accountId]] as const) expect(await exists(t, id)).toBe(false);
  await db.delete(schema.appSetting).where(eq(schema.appSetting.key, `account-deleted:${lone.id}`));
});
