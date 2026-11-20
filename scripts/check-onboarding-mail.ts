// The welcome, the day 3 and day 7 nudges (lib/first-use-mail.ts) and the "Connect your agent" email after Welcome
// (lib/connect-mail.ts) against the LOCAL database, with mail going to
// the console and .data/last-mail.txt. It makes its own people, runs the nudges twice and the welcome once, and
// removes what it made. The run is set on a morning years ahead, so no real account falls in its windows.
// tests/first-use-mail.test.ts checks which step each nudge names.
//   npm run check:onboarding-mail
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import { eq, inArray } from "drizzle-orm";
import { db, pool, schema } from "../lib/db";
import { runMigrations } from "../lib/db/migrate";
import { ensurePersonalWorkspace, newId } from "../lib/workspace-core";
import { ensureBuiltinTemplates } from "../lib/template-seed";
import { NUDGE_DAYS, nudgeKey, nudgeWindow, sendNudges, sendWelcome, welcomeKey } from "../lib/first-use-mail";
import { CONNECT_AFTER_DAYS, connectLater, connectMailKey, pendingKey, sendConnectReminders } from "../lib/connect-mail";

const DAY = 24 * 60 * 60 * 1000;
const LAST_MAIL = path.join(process.cwd(), ".data", "last-mail.txt");
const NOW = new Date(Date.UTC(2031, 0, 10, 4, 0));

async function lastMail(): Promise<string | null> {
  try { return await fs.readFile(LAST_MAIL, "utf8"); } catch { return null; }
}

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("check:onboarding-mail only runs against the local database");
  if (process.env.RESEND_API_KEY) throw new Error("check:onboarding-mail runs with RESEND_API_KEY blank, so nothing leaves the machine");
  await runMigrations();

  const tag = newId().slice(0, 8);
  const made = { users: [] as string[], orgs: [] as string[] };
  const person = async (name: string, opts: { daysAgo: number; language?: string; digest?: boolean; hidden?: boolean }) => {
    const id = newId();
    const email = `check-onboarding-${name}-${tag}@example.invalid`;
    const at = new Date(NOW.getTime() - opts.daysAgo * DAY);
    await db.insert(schema.user).values({ id, name, email, language: opts.language ?? "en", digestEmails: opts.digest ?? true, firstStepsDoneAt: opts.hidden ? at : null, createdAt: at, updatedAt: at });
    made.users.push(id);
    const orgId = await ensurePersonalWorkspace(id, name, email, opts.language);
    made.orgs.push(orgId);
    const projectId = newId();
    await db.insert(schema.project).values({ id: projectId, organizationId: orgId, name: `${name}'s project`, createdBy: id, createdAt: at, updatedAt: at });
    return { id, email, orgId, projectId, language: opts.language ?? "en" };
  };

  try {
    for (const day of NUDGE_DAYS) {
      const { from, to } = nudgeWindow(NOW, day);
      assert.equal(to.getTime() - from.getTime(), DAY, `day ${day}: the window is one whole day`);
      assert.deepEqual(nudgeWindow(new Date(NOW.getTime() + DAY), day).from, to, `day ${day}: the next morning starts where this one ended`);
      assert.deepEqual(nudgeWindow(new Date(NOW.getTime() + 19 * 60 * 60 * 1000), day), { from, to }, `day ${day}: a late run the same day takes the same window`);
    }

    const empty = await person("ana", { daysAgo: 3.5 });
    const emptyEs = await person("lucia", { daysAgo: 7.2, language: "es" });
    const filed = await person("bea", { daysAgo: 3.5 });
    const early = await person("carla", { daysAgo: 2 });
    const quiet = await person("dani", { daysAgo: 3.5, digest: false });
    const hidden = await person("eva", { daysAgo: 7.5, hidden: true });
    const everyone = [empty, emptyEs, filed, early, quiet, hidden];

    // The built-in templates bring sample references: they must not count as the person's own
    await ensureBuiltinTemplates(empty.orgId).catch((err) => console.log(`(templates not loaded: ${err instanceof Error ? err.message : err})`));
    const samples = await db.select({ id: schema.projectItem.itemId }).from(schema.projectItem).where(eq(schema.projectItem.organizationId, empty.orgId));
    console.log(`ana's workspace has ${samples.length} sample references from the templates`);
    // A project cloned from a template files the same sample references: still not hers
    if (samples[0]) await db.insert(schema.projectItem).values({ projectId: empty.projectId, itemId: samples[0].id, organizationId: empty.orgId, addedBy: empty.id, createdAt: new Date() });

    const itemId = newId();
    await db.insert(schema.inspoItem).values({ id: itemId, organizationId: filed.orgId, name: "Linear", web: "https://linear.app", webKey: "linear.app", date: "2031-01-08", author: "bea", createdBy: filed.id, tagStatus: "done", createdAt: new Date(), updatedAt: new Date() });
    await db.insert(schema.projectItem).values({ projectId: filed.projectId, itemId, organizationId: filed.orgId, addedBy: filed.id, createdAt: new Date() });

    await fs.rm(LAST_MAIL, { force: true });
    const first = await sendNudges(NOW);
    assert.deepEqual(first, { due: 3, sent: 3 }, "ana and bea on day 3, lucia on day 7: three mails");
    const mail = await lastMail();
    assert.ok(mail && [empty.email, emptyEs.email, filed.email].some((e) => mail.startsWith(e)), "the last mail went to one of them");
    const keys = (await db.select({ key: schema.appSetting.key }).from(schema.appSetting)
      .where(inArray(schema.appSetting.key, everyone.flatMap((p) => NUDGE_DAYS.map((d) => nudgeKey(d, p.id)))))).map((r) => r.key).sort();
    assert.deepEqual(keys, [nudgeKey(3, empty.id), nudgeKey(3, filed.id), nudgeKey(7, emptyEs.id)].sort(), "no nudge for an account too new, the digest off, or the list hidden");

    await fs.rm(LAST_MAIL, { force: true });
    const second = await sendNudges(NOW);
    assert.deepEqual(second, { due: 3, sent: 0 }, "the second run sends nothing");
    assert.equal(await lastMail(), null, "no mail written on the second run");

    await fs.rm(LAST_MAIL, { force: true });
    assert.equal(await sendWelcome(empty), true, "the welcome goes out");
    assert.equal(await sendWelcome(emptyEs), true, "the welcome goes out in Spanish");
    assert.equal(await sendWelcome(empty), false, "and only once");
    const welcome = await lastMail();
    assert.ok(welcome?.startsWith(emptyEs.email), "the last welcome went to lucia");

    // Welcome ended unconnected: ana's waited long enough, carla's not yet, dani turned the digest off
    await connectLater(empty.id, new Date(NOW.getTime() - (CONNECT_AFTER_DAYS + 0.5) * DAY));
    await connectLater(early.id, new Date(NOW.getTime() - (CONNECT_AFTER_DAYS - 1) * DAY));
    await connectLater(quiet.id, new Date(NOW.getTime() - (CONNECT_AFTER_DAYS + 0.5) * DAY));
    await fs.rm(LAST_MAIL, { force: true });
    await sendConnectReminders(NOW);
    const connect = await lastMail();
    assert.ok(connect?.startsWith(empty.email) && connect.includes("/mcp"), "the connect email went to ana with the connector's address");
    const connectKeys = (await db.select({ key: schema.appSetting.key }).from(schema.appSetting)
      .where(inArray(schema.appSetting.key, everyone.flatMap((p) => [connectMailKey(p.id), pendingKey(p.id)])))).map((r) => r.key).sort();
    assert.deepEqual(connectKeys, [connectMailKey(empty.id), pendingKey(early.id)].sort(), "ana's sent and settled, carla's still waiting, dani's dropped");
    await fs.rm(LAST_MAIL, { force: true });
    await sendConnectReminders(NOW);
    assert.equal(await lastMail(), null, "the next morning sends nothing more");
  } finally {
    const keys = made.users.flatMap((id) => [welcomeKey(id), ...NUDGE_DAYS.map((d) => nudgeKey(d, id)), connectMailKey(id), pendingKey(id)]);
    if (keys.length) await db.delete(schema.appSetting).where(inArray(schema.appSetting.key, keys));
    if (made.orgs.length) await db.delete(schema.organization).where(inArray(schema.organization.id, made.orgs));
    if (made.users.length) {
      await db.delete(schema.billingAccount).where(inArray(schema.billingAccount.ownerUserId, made.users));
      await db.delete(schema.user).where(inArray(schema.user.id, made.users));
    }
  }
  console.log("\ncheck:onboarding-mail ok");
}

main().then(() => pool.end(), async (e) => { console.error(e); await pool.end(); process.exit(1); });
