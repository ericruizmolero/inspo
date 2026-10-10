// Check of the reconciliation with OpenRouter (#28), of who decides an automatic pass (#91) and of the free plan's
// room (#124): references, storage and one free workspace each. Not a test framework: assert.
//   npm run check:usage
import assert from "node:assert/strict";
import { drift } from "../lib/usage-check";
import { AUTO_SYSTEM_PER_DAY, BRAND_CHAIN_MS, autoBrandPass, autoSystemPass } from "../lib/usage-core";
import { GB, fmtGb, mayCreateTeam, roomLeft, whatIsFull } from "../lib/room";
import { PLANS, isPaid } from "../lib/plans";

assert.equal(drift(10, 10.05), null);            // 0.5%: matches
assert.equal(drift(0.004, 0.012), null);         // under a cent: noise
assert.ok((drift(10, 10.5) ?? 0) > 0.01);        // 4.8%: warns
assert.ok((drift(0, 1) ?? 0) === 1);             // we logged nothing: warns

// A re-read is free only when the board moved since the last run, and only so many a day
const moved = { lastStamp: "a", stamp: "b", autoToday: 0 };
assert.equal(autoSystemPass(true, moved), true);
assert.equal(autoSystemPass(false, moved), false, "not asked: counts");
assert.equal(autoSystemPass(true, { ...moved, stamp: "a" }), false, "auto: true by hand on an unchanged board counts");
assert.equal(autoSystemPass(true, { ...moved, lastStamp: null }), false, "the first read counts");
assert.equal(autoSystemPass(true, { ...moved, autoToday: AUTO_SYSTEM_PER_DAY }), false, "past the day's limit counts");

// A brand pass is free once, right after a system pass that counted
const now = new Date("2026-10-10T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
assert.equal(autoBrandPass(true, { systemAt: ago(5_000), brandAt: ago(3_600_000), now }), true);
assert.equal(autoBrandPass(true, { systemAt: ago(5_000), brandAt: null, now }), true);
assert.equal(autoBrandPass(true, { systemAt: null, brandAt: null, now }), false, "auto: true by hand with no system pass counts");
assert.equal(autoBrandPass(true, { systemAt: ago(10_000), brandAt: ago(5_000), now }), false, "a second brand pass on one system pass counts");
assert.equal(autoBrandPass(true, { systemAt: ago(BRAND_CHAIN_MS + 1), brandAt: null, now }), false, "too long after counts");
assert.equal(autoBrandPass(false, { systemAt: ago(5_000), brandAt: null, now }), false, "not asked: counts");
// The free plan is the one nobody pays for, whatever its key: 200 references and 1 GB. The paid ones have no cap
const free = PLANS.find((p) => !isPaid(p))!;
assert.equal(free.itemsMax, 200);
assert.equal(free.storageMaxBytes, GB);
assert.ok(PLANS.filter(isPaid).every((p) => p.itemsMax === null && p.storageMaxBytes === null), "paid plans keep no cap");

// Room: what is left, and what runs out first
const at199 = roomLeft(free, { items: 199, bytes: 0 });
assert.deepEqual(at199, { items: 1, bytes: GB });
assert.equal(whatIsFull(at199, { items: 1 }), null, "the 200th reference fits");
const at200 = roomLeft(free, { items: 200, bytes: 0 });
assert.equal(whatIsFull(at200, { items: 1 }), "items", "the 201st does not");
assert.equal(whatIsFull(roomLeft(free, { items: 250, bytes: 0 }), { items: 1 }), "items", "past the cap (after a downgrade) is full, never negative room");
assert.equal(roomLeft(free, { items: 250, bytes: 0 }).items, 0);
assert.equal(whatIsFull(roomLeft(free, { items: 10, bytes: GB - 100 }), { bytes: 100 }), null, "a file that fills it exactly fits");
assert.equal(whatIsFull(roomLeft(free, { items: 10, bytes: GB - 100 }), { bytes: 101 }), "storage");
assert.equal(whatIsFull(roomLeft(free, { items: 200, bytes: GB }), {}), null, "asking for nothing never fails: viewing, searching, exporting");
assert.equal(whatIsFull(roomLeft(free, { items: 200, bytes: 0 }), { items: 1, bytes: 1 }), "items", "references are named before storage");
const paid = PLANS.find(isPaid)!;
assert.equal(whatIsFull(roomLeft(paid, { items: 1e6, bytes: 1e13 }), { items: 1, bytes: GB }), null, "a paid plan never fills");

// The room an import shares out among its references (addMany; check:limits runs one against the database)
assert.equal(roomLeft(free, { items: 190, bytes: 0 }).items, 10, "an import of 25 at 190 brings in 10");
assert.equal(roomLeft(free, { items: 0, bytes: 0 }).items, 200);
assert.equal(roomLeft(paid, { items: 5000, bytes: 0 }).items, null, "a paid plan shares out no room: all of it comes in");

// Gigabytes in the person's language: "0,4 de 1 GB"
assert.equal(fmtGb(0.4 * GB, "es"), "0,4");
assert.equal(fmtGb(0.4 * GB, "en"), "0.4");
assert.equal(fmtGb(GB, "es"), "1");
assert.equal(fmtGb(0, "en"), "0");
assert.equal(fmtGb(0.03 * GB, "es"), "0,03", "a start still shows");
assert.equal(fmtGb(2.25 * GB, "en"), "2.3");

// One free workspace each: another team takes a paid workspace the person owns
assert.equal(mayCreateTeam([free]), false, "only the personal space: no second free one");
assert.equal(mayCreateTeam([]), false);
assert.equal(mayCreateTeam([free, free]), false);
assert.equal(mayCreateTeam([free, paid]), true);
console.log("check:usage ok");
