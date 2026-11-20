// The emails that tell a person their place in a team changed, run through the real doors: Better Auth's own
// endpoints with a signed session cookie (accept, change a role, remove, leave), the app's actions as the person who
// clicks (hand over, delete) and the morning's reminder. Mail is recorded, never sent.
import { createHmac, randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { db, schema } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createBillingAccount, ensurePersonalWorkspace, newId } from "@/lib/workspace-core";
import { handOverTeam, deleteTeam } from "@/app/actions/workspace";
import { sendInvitationReminders } from "@/lib/team-mail";
import type { Mail } from "@/lib/mail-templates";
import { actAs, reached, type Actor } from "./harness";

vi.mock("@/lib/mail", async (importOriginal) => {
  const { reached, checkedMail } = await import("./harness");
  return {
    ...(await importOriginal<object>()),
    sendMail: async (to: string | string[], m: Mail) => { reached.push(["mail", { to: [to].flat(), ...checkedMail(m) }]); },
  };
});

const tag = `tmail${randomBytes(4).toString("hex")}`;
const TEAM = `${tag} team`;
const person = (who: string, language = "en"): Actor & { language: string } =>
  ({ id: `${tag}-${who}`, name: `${tag} ${who}`, email: `${tag}-${who}@example.test`, workspaceId: "", language });
const owner = person("owner"), admin = person("admin"), joiner = person("joiner", "es"), second = person("second"), third = person("third");
const everyone = [owner, admin, joiner, second, third];
let team = "", accountId = "";
const memberIds: Record<string, string> = {};

type Sent = Mail & { to: string[] };
const mails = () => reached.filter(([what]) => what === "mail").map(([, m]) => m as Sent);
const sentTo = (p: Actor) => mails().filter((m) => m.to.includes(p.email));

/** A real Better Auth session for `who`, as the browser would send it */
async function as(who: Actor): Promise<Headers> {
  const token = randomBytes(16).toString("hex");
  const now = new Date();
  await db.insert(schema.session).values({ id: newId(), token, userId: who.id, expiresAt: new Date(+now + 3_600_000), createdAt: now, updatedAt: now, activeOrganizationId: team });
  const ctx = await auth.$context;
  const signature = createHmac("sha256", ctx.secret).update(token).digest("base64");
  return new Headers({ cookie: `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(`${token}.${signature}`)}` });
}

async function invite(by: Actor, to: Actor, { expiresAt = new Date(Date.now() + 7 * 86_400_000), role = "member" } = {}) {
  const id = newId();
  await db.insert(schema.invitation).values({ id, organizationId: team, email: to.email, role, status: "pending", expiresAt, createdAt: new Date(), inviterId: by.id });
  return id;
}

const roleOf = async (who: Actor) =>
  (await db.select({ role: schema.member.role }).from(schema.member).where(eq(schema.member.id, memberIds[who.id])))[0]?.role;

beforeAll(async () => {
  const now = new Date();
  await db.insert(schema.user).values(everyone.map((a) => ({ id: a.id, name: a.name, email: a.email, emailVerified: true, language: a.language, createdAt: now, updatedAt: now })));
  accountId = await createBillingAccount({ name: TEAM, ownerUserId: owner.id, plan: "agency" });
  team = newId();
  await db.insert(schema.organization).values({ id: team, name: TEAM, slug: `${tag}-team`, createdAt: now, kind: "team", billingAccountId: accountId });
  for (const [who, role] of [[owner, "owner"], [admin, "admin"]] as const) {
    memberIds[who.id] = newId();
    await db.insert(schema.member).values({ id: memberIds[who.id], organizationId: team, userId: who.id, role, createdAt: now });
  }
  for (const a of everyone) a.workspaceId = team;
});

beforeEach(() => { reached.length = 0; });

afterAll(async () => {
  actAs(null);
  const ids = everyone.map((a) => a.id);
  const spaces = await db.select({ id: schema.member.organizationId }).from(schema.member).where(inArray(schema.member.userId, ids));
  await db.delete(schema.organization).where(inArray(schema.organization.id, [team, ...spaces.map((s) => s.id)]));
  await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, ids));
  await db.delete(schema.appSetting).where(inArray(schema.appSetting.key, [...invitationIds].map((id) => `invite-ending:${id}`)));
  await db.delete(schema.user).where(inArray(schema.user.id, ids));
});

const invitationIds = new Set<string>();

async function accept(who: Actor, invitationId: string) {
  invitationIds.add(invitationId);
  const res = await auth.api.acceptInvitation({ body: { invitationId }, headers: await as(who) });
  memberIds[who.id] = res!.member.id;
}

test("an accepted invitation tells whoever sent it and the owner, each in their language, and not the one who joined", async () => {
  await accept(joiner, await invite(admin, joiner));
  const joined = { template: "member-joined", locale: "en", vars: { WHO: joiner.name, TEAM } };
  expect(sentTo(admin), "the admin who invited").toMatchObject([joined]);
  expect(sentTo(owner), "the owner").toMatchObject([joined]);
  expect(sentTo(joiner), "nothing to the one who joined").toEqual([]);
  expect(mails().length).toBe(2);
});

test("when the owner sent the invitation, the owner gets one email, not two", async () => {
  await accept(second, await invite(owner, second));
  expect(mails().map((m) => m.to)).toEqual([[owner.email]]);
});

test("a role changed by someone else tells that person; a role someone changes on themselves tells nobody", async () => {
  await auth.api.updateMemberRole({ body: { memberId: memberIds[joiner.id], role: "admin", organizationId: team }, headers: await as(owner) });
  expect(await roleOf(joiner)).toBe("admin");
  expect(mails(), "in Spanish, the joiner's language").toMatchObject([{ to: [joiner.email], template: "member-now-admin", locale: "es", vars: { WHO: owner.name, TEAM } }]);

  reached.length = 0;
  await auth.api.updateMemberRole({ body: { memberId: memberIds[admin.id], role: "member", organizationId: team }, headers: await as(admin) });
  expect(await roleOf(admin), "the admin stepped down").toBe("member");
  expect(mails(), "no email to whoever changed their own role").toEqual([]);
  await auth.api.updateMemberRole({ body: { memberId: memberIds[admin.id], role: "admin", organizationId: team }, headers: await as(owner) });
});

test("removing someone tells them; leaving, or removing yourself, tells nobody", async () => {
  await auth.api.removeMember({ body: { memberIdOrEmail: memberIds[second.id], organizationId: team }, headers: await as(owner) });
  expect(mails()).toEqual([{ to: [second.email], template: "member-removed", locale: "en", vars: { WHO: owner.name, TEAM } }]);

  reached.length = 0;
  await accept(third, await invite(owner, third));
  reached.length = 0;
  await auth.api.leaveOrganization({ body: { organizationId: team }, headers: await as(third) });
  expect(mails(), "leaving sends nothing").toEqual([]);
  await accept(third, await invite(owner, third, { role: "admin" }));
  reached.length = 0;
  await auth.api.removeMember({ body: { memberIdOrEmail: memberIds[third.id], organizationId: team }, headers: await as(third) });
  expect(mails(), "removing yourself sends nothing").toEqual([]);
});

test("only the owner can hand the team over; the new owner is told, the old one is an admin, billing stays put", async () => {
  actAs(admin);
  expect((await handOverTeam(team, memberIds[joiner.id])).ok, "an admin cannot").toBe(false);
  actAs(owner);
  expect((await handOverTeam(team, memberIds[owner.id])).ok, "not to yourself").toBe(false);
  expect(mails(), "a refused hand-over sends nothing").toEqual([]);
  expect(await roleOf(owner)).toBe("owner");

  expect(await handOverTeam(team, memberIds[joiner.id])).toEqual({ ok: true, data: undefined });
  expect(await roleOf(joiner), "the new owner").toBe("owner");
  expect(await roleOf(owner), "the old owner").toBe("admin");
  const [account] = await db.select({ ownerUserId: schema.billingAccount.ownerUserId }).from(schema.billingAccount).where(eq(schema.billingAccount.id, accountId));
  expect(account.ownerUserId, "the billing account stays with whoever paid").toBe(owner.id);
  expect(mails()).toMatchObject([{ to: [joiner.email], template: "member-now-owner", locale: "es", vars: { WHO: owner.name, TEAM } }]);

  expect((await handOverTeam(team, memberIds[admin.id])).ok, "the old owner cannot do it a second time").toBe(false);
  // Now an admin, the old owner leaves like anyone else
  await auth.api.leaveOrganization({ body: { organizationId: team }, headers: await as(owner) });
  expect(await roleOf(owner), "gone from the team").toBeUndefined();
});

test("the morning reminds an invitation once, only the day before it ends, in the invitee's language", async () => {
  const now = new Date();
  const utcDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const at = (days: number, hours: number) => new Date(utcDay + days * 86_400_000 + hours * 3_600_000);
  const tomorrow = await invite(admin, second, { expiresAt: at(1, 15) });
  const later = await invite(admin, third, { expiresAt: at(3, 9) });
  const today = await invite(admin, owner, { expiresAt: at(0, 23) });
  for (const id of [tomorrow, later, today]) invitationIds.add(id);
  // The local database may hold other teams' invitations: only this team's mail is looked at
  const ours = () => mails().filter((m) => "TEAM" in m.vars && m.vars.TEAM === TEAM);

  await sendInvitationReminders(now);
  expect(ours(), "only the one ending tomorrow").toMatchObject([{ to: [second.email], template: "member-invite-ending", locale: "en", vars: { INVITER: admin.name, TEAM, INVITEE: second.email } }]);
  expect(ours()[0].vars, "the link to accept").toHaveProperty("URL", expect.stringMatching(new RegExp(`/invite/${tomorrow}\\?lang=en$`)));

  reached.length = 0;
  await sendInvitationReminders(now);
  expect(ours(), "the job delivered again: nobody gets it twice").toEqual([]);
  await sendInvitationReminders(at(2, 6));
  expect(ours().map((m) => m.to), "two mornings on, the one ending the day after").toEqual([[third.email]]);
  await db.update(schema.invitation).set({ status: "canceled" }).where(inArray(schema.invitation.id, [tomorrow, later, today]));
});

test("deleting a team tells every other member before it goes, never the one who deleted it", async () => {
  const left = await db.select({ userId: schema.member.userId }).from(schema.member).where(eq(schema.member.organizationId, team));
  // With another space open: deleting the open one switches through Better Auth, which the test session cannot reach
  actAs({ ...joiner, workspaceId: await ensurePersonalWorkspace(joiner.id, joiner.name, joiner.email, "es") });
  expect(await deleteTeam(team)).toMatchObject({ ok: true });
  const others = left.map((m) => m.userId).filter((id) => id !== joiner.id);
  expect(others.length, "someone else is still in the team").toBeGreaterThan(0);
  expect(mails().flatMap((m) => m.to).sort()).toEqual(everyone.filter((a) => others.includes(a.id)).map((a) => a.email).sort());
  expect(mails().map(({ template, vars }) => [template, vars])).toEqual(mails().map(() => ["team-deleted", { WHO: joiner.name, TEAM }]));
  expect(sentTo(joiner)).toEqual([]);
});
