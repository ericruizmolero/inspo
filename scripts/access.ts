// Invites from the console, the same as /admin/waitlist does them (lib/waves.ts). Prints every link: the code is
// never shown again.
//   npm run access -- invite <email> [--uses N] [--no-mail]
//   npm run access -- wave <n> [name]
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import { pool } from "../lib/db";
import { createInvite, normalEmail } from "../lib/access";
import { inviteLink, mailInvite, nextByPriority, openWave, WAVE_CAP } from "../lib/waves";

const USAGE = `Usage:
  npm run access -- invite <email> [--uses N] [--no-mail]
  npm run access -- wave <n> [name]     (n up to ${WAVE_CAP})`;

const base = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function fail(msg: string): never {
  console.log(msg);
  process.exit(1);
}

async function invite(args: string[]) {
  const email = args.find((a) => !a.startsWith("--") && !/^\d+$/.test(a));
  if (!email?.includes("@")) fail(USAGE);
  const usesAt = args.indexOf("--uses");
  const uses = usesAt >= 0 ? Number(args[usesAt + 1]) : 1;
  if (!Number.isInteger(uses) || uses < 1) fail("--uses takes a whole number, 1 or more");
  const mail = normalEmail(email);
  const { code } = await createInvite({ email: mail, maxUses: uses });
  console.log(`${mail}  ${inviteLink(base, code)}`);
  if (args.includes("--no-mail")) return;
  await mailInvite(mail, code, base).then(() => console.log("  mail sent"), (e) => console.log(`  mail not sent: ${e instanceof Error ? e.message : e}`));
}

async function wave(args: string[]) {
  const n = Number(args[0]);
  if (!Number.isInteger(n) || n < 1 || n > WAVE_CAP) fail(USAGE);
  const name = args[1]?.trim() || `wave-${new Date().toISOString().slice(0, 10)}`;
  const next = await nextByPriority(n);
  if (!next.length) fail("No one is waiting");
  console.log(`Wave "${name}": ${next.length} ${next.length === 1 ? "person" : "people"}`);
  const results = await openWave(next.map((e) => e.id), { wave: name }, base);
  for (const r of results) {
    if (r.status === "skipped") console.log(`  skipped ${r.entryId}: no longer waiting`);
    else console.log(`  ${r.status === "sent" ? "sent  " : "FAILED"} ${r.email}  ${inviteLink(base, r.code)}`);
  }
  const failed = results.filter((r) => r.status === "failed").length;
  if (failed) console.log(`${failed} not mailed. Their invites stand: resend from /admin/waitlist, or send the link above.`);
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (command === "invite") await invite(args);
  else if (command === "wave") await wave(args);
  else fail(USAGE);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => pool.end());
