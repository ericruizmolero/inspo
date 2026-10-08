// Team emails and the bell (lib/notify.ts) against the LOCAL database. Sends nothing, moves no marker:
// it builds every digest the morning cron would send right now and prints them, plus the signed stop links.
// Not a test framework: assert for the pure parts, look at the output for the rest.
//   npm run check:notifications
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { pool } from "../lib/db";
import { runMigrations } from "../lib/db/migrate";
import { activityLines, digestGroups, digestSummary, sendDigests, unsubscribeUrl, unsubscribeValid, type TeamEvent } from "../lib/notify";

async function main() {
  if (!/127\.0\.0\.1|localhost/.test(process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/criterio")) throw new Error("check:notifications only runs against the local database");
  await runMigrations();

  // The stop link: the signature only opens for the person and kind it was made for
  const url = new URL(unsubscribeUrl("user-1", "digest"));
  const q = url.searchParams;
  assert.equal(url.pathname, "/unsubscribe");
  assert.ok(unsubscribeValid(q.get("u"), q.get("k"), q.get("s")));
  assert.ok(!unsubscribeValid("user-2", q.get("k"), q.get("s")), "another person");
  assert.ok(!unsubscribeValid(q.get("u"), "replies", q.get("s")), "another kind");
  assert.ok(!unsubscribeValid(q.get("u"), q.get("k"), `${q.get("s")}0`), "a longer signature");
  assert.ok(!unsubscribeValid(q.get("u"), "digest", "x".repeat(32)), "a wrong signature of the right length");

  // Lines: references added by one person in one project fold into one line; comments stay one each
  const at = (m: number) => new Date(Date.UTC(2026, 9, 8, 10, m));
  const events: TeamEvent[] = [
    { at: at(1), by: "a", byName: "Alberto", byImage: null, projectId: "p1", kind: "ref", path: "/i/1", what: "Superr" },
    { at: at(2), by: "a", byName: "Alberto", byImage: null, projectId: "p1", kind: "ref", path: "/i/2", what: "Linear" },
    { at: at(3), by: "a", byName: "Alberto", byImage: null, projectId: "p1", kind: "ref", path: "/i/3", what: "Vercel" },
    { at: at(4), by: "b", byName: "Andoni", byImage: null, projectId: null, kind: "ref", path: "/i/4", what: "Stripe" },
    { at: at(5), by: "a", byName: "Alberto", byImage: null, projectId: "p1", kind: "comment", path: "/i/1", what: "Superr", quote: "Me gusta el scroll  \n pero cansa" },
    { at: at(6), by: "b", byName: "Andoni", byImage: null, projectId: "p1", kind: "decision", path: "/?in=p1&view=system", what: "color", quote: "Ember sobre papel" },
    { at: at(7), by: "a", byName: "Alberto", byImage: null, projectId: "p1", kind: "vote", path: "/?in=p1", what: "" },
    { at: at(8), by: "a", byName: "Alberto", byImage: null, projectId: "p1", kind: "vote", path: "/?in=p1", what: "" },
  ];
  const lines = activityLines(events, "es");
  assert.deepEqual(lines.map((l) => l.text), [
    "Alberto añadió 3 referencias", "Andoni añadió una referencia", "Alberto en Superr", "Andoni decidió Color", "Alberto votó 2 referencias en el Pulido",
  ]);
  assert.equal(lines[0].path, "/?in=p1", "several references open the project");
  assert.equal(lines[1].path, "/i/4", "one reference opens itself");
  assert.equal(lines[2].quote, "Me gusta el scroll pero cansa", "a quote is one line");
  assert.equal(activityLines(events, "en")[3].text, "Andoni decided Color");
  assert.equal(digestSummary(events, "es"), "1 comentario, 4 referencias nuevas, 1 decisión, 2 votos");

  const groups = digestGroups(events, "es", new Map([["p1", "Landing Criterio"]]));
  assert.deepEqual(groups.map((g) => g.title), ["Landing Criterio", "Biblioteca"], "the library goes last");
  assert.ok(groups[0].lines[0].url.startsWith("http"), "email links are absolute");

  // The real thing, dry: what the cron would send this morning
  const run = await sendDigests(new Date(), true);
  console.log(`teams ${run.teams}, would send ${run.sent}, pause ${run.paused}, skip ${run.skipped}`);
  for (const m of run.mails) console.log(`\n→ ${m.to}\n${m.subject}\n${m.text}`);
  console.log("\ncheck:notifications ok");
}

main().then(() => pool.end(), async (e) => { console.error(e); await pool.end(); process.exit(1); });
