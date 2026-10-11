// One plan for several workspaces: an Agency account holds its clients' workspaces, their AI actions come out of one
// pool, even a deleted one's, and a plan of one workspace refuses a second. Runs the Settings, Plan actions as the people who click them.
import { randomBytes } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, expect, test } from "vitest";
import { db, schema } from "@/lib/db";
import { accountOf, accountWorkspaces, ensurePersonalWorkspace, listWorkspaces, newId } from "@/lib/workspace-core";
import { countWorkspaces, quotaStatus } from "@/lib/quota";
import { createWorkspaceInAccount, moveWorkspaceToAccount } from "@/app/actions/billing";
import { deleteTeam } from "@/app/actions/workspace";
import { actAs, type Actor } from "./harness";
import { cleanupTeam, seedTeam, type Team } from "./library/seed";

const tag = `bill${randomBytes(4).toString("hex")}`;
const person = (who: string): Actor => ({ id: `${tag}-${who}`, name: `${tag} ${who}`, email: `${tag}-${who}@example.test`, workspaceId: "" });
const agency = person("agency"), solo = person("solo");
let other: Team;

async function signUp(a: Actor, plan?: "agency") {
  const now = new Date();
  await db.insert(schema.user).values({ id: a.id, name: a.name, email: a.email, emailVerified: true, createdAt: now, updatedAt: now });
  a.workspaceId = await ensurePersonalWorkspace(a.id, a.name, a.email, "en", plan);
}

const usage = (organizationId: string, n: number) =>
  db.insert(schema.aiUsage).values(Array.from({ length: n }, () => ({ id: newId(), organizationId, action: "polish", model: "test", ref: tag, createdAt: new Date() })));

const workspacesOf = async (a: Actor) => listWorkspaces(a.id);

beforeAll(async () => {
  await signUp(agency, "agency");
  await signUp(solo);
  // Another Agency account, whose usage must not reach this one's pool
  other = await seedTeam();
  await usage(other.ws.id, 7);
});

afterAll(async () => {
  actAs(null);
  const ids = [agency.id, solo.id];
  const spaces = await db.select({ id: schema.member.organizationId }).from(schema.member).where(inArray(schema.member.userId, ids));
  if (spaces.length) await db.delete(schema.organization).where(inArray(schema.organization.id, spaces.map((s) => s.id)));
  await db.delete(schema.organization).where(like(schema.organization.id, `${tag}%`));
  // Spend outlives its workspace: dropped here by its tag
  await db.delete(schema.aiUsage).where(eq(schema.aiUsage.ref, tag));
  await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, ids));
  await db.delete(schema.billingAccount).where(like(schema.billingAccount.id, `${tag}%`));
  await db.delete(schema.user).where(inArray(schema.user.id, ids));
  await cleanupTeam(other);
});

test("an Agency account creates three client workspaces on its one plan, and they share one AI pool", async () => {
  actAs(agency);
  const made: string[] = [];
  for (const name of ["Client A", "Client B", "Client C"]) {
    const r = await createWorkspaceInAccount(name);
    expect(r, `${name} is created`).toMatchObject({ ok: true });
    if (r.ok) made.push(r.data.id);
  }
  const account = (await accountOf(agency.workspaceId))!;
  const mine = await workspacesOf(agency);
  const clients = mine.filter((w) => made.includes(w.id));
  expect(clients.map((w) => w.name).sort()).toEqual(["Client A", "Client B", "Client C"]);
  expect(clients.every((w) => w.billingAccountId === account.id && w.plan === "agency" && w.role === "owner"), "all three on the Agency account").toBe(true);

  await usage(made[0], 3);
  await usage(made[1], 2);
  const q = await quotaStatus(clients.find((w) => w.id === made[2])!);
  expect(q.ai, "the third workspace sees what the other two spent, and nothing of another account").toEqual({ used: 5, limit: 2000 });
  expect(q.workspaces, "the personal space and three clients, of 10").toEqual({ used: 4, limit: 10 });
  expect(q.members, "seats still count per workspace").toEqual({ used: 1, limit: 15 });
  expect((await accountWorkspaces(account.id)).map((w) => [w.name, w.people]), "Settings, Plan lists the four, each with its one person")
    .toEqual([[agency.name, 1], ["Client A", 1], ["Client B", 1], ["Client C", 1]]);
});

test("a plan of one workspace refuses a second, and nothing is created", async () => {
  actAs(solo);
  const r = await createWorkspaceInAccount("Second");
  expect(r.ok).toBe(false);
  if (!r.ok) expect(r.error).toMatch(/Solo plan holds one workspace/);
  expect(await countWorkspaces((await accountOf(solo.workspaceId))!.id)).toBe(1);
});

test("only the account's owner adds to it", async () => {
  const [client] = (await workspacesOf(agency)).filter((w) => w.name === "Client A");
  await db.insert(schema.member).values({ id: `${tag}-m`, organizationId: client.id, userId: solo.id, role: "admin", createdAt: new Date() });
  actAs({ ...solo, workspaceId: client.id });
  const r = await createWorkspaceInAccount("Not mine to pay");
  expect(r).toMatchObject({ ok: false });
  expect((await workspacesOf(agency)).some((w) => w.name === "Not mine to pay")).toBe(false);
});

test("a team the owner has on another account moves in, and its empty account goes", async () => {
  const oldAccount = `${tag}-old`, teamId = `${tag}-team`;
  await db.insert(schema.billingAccount).values({ id: oldAccount, name: "Old studio", plan: "studio", ownerUserId: agency.id });
  await db.insert(schema.organization).values({ id: teamId, name: "Old studio", slug: teamId, kind: "team", billingAccountId: oldAccount, createdAt: new Date() });
  await db.insert(schema.member).values({ id: `${tag}-owner`, organizationId: teamId, userId: agency.id, role: "owner", createdAt: new Date() });

  actAs(agency);
  expect(await moveWorkspaceToAccount(teamId)).toMatchObject({ ok: true });
  const moved = (await workspacesOf(agency)).find((w) => w.id === teamId)!;
  expect(moved.billingAccountId).toBe((await accountOf(agency.workspaceId))!.id);
  expect(moved.plan).toBe("agency");
  expect(await db.select().from(schema.billingAccount).where(eq(schema.billingAccount.id, oldAccount)), "the old account is gone").toEqual([]);

  actAs(solo);
  expect(await moveWorkspaceToAccount(teamId), "nobody moves a team they do not own").toMatchObject({ ok: false });
});

test("a client workspace deleted keeps what it spent in the account's pool, and a team deleted alone takes its account", async () => {
  actAs(agency);
  const mine = await workspacesOf(agency);
  const [b] = mine.filter((w) => w.name === "Client B");
  const personal = mine.find((w) => w.id === agency.workspaceId)!;
  const before = await quotaStatus(personal);
  expect(await deleteTeam(b.id)).toMatchObject({ ok: true });
  const after = await quotaStatus(personal);
  expect(after.ai, "Client B's 2 actions still count this month").toEqual(before.ai);
  expect(after.workspaces.used, "one workspace fewer").toBe(before.workspaces.used - 1);

  const lone = `${tag}-lone`, loneTeam = `${tag}-loneteam`;
  await db.insert(schema.billingAccount).values({ id: lone, name: "Alone", plan: "solo", ownerUserId: agency.id });
  await db.insert(schema.organization).values({ id: loneTeam, name: "Alone", slug: loneTeam, kind: "team", billingAccountId: lone, createdAt: new Date() });
  await db.insert(schema.member).values({ id: `${tag}-lone-owner`, organizationId: loneTeam, userId: agency.id, role: "owner", createdAt: new Date() });
  await usage(loneTeam, 1);
  expect(await deleteTeam(loneTeam)).toMatchObject({ ok: true });
  expect(await db.select().from(schema.billingAccount).where(eq(schema.billingAccount.id, lone)), "its account is gone").toEqual([]);
});
