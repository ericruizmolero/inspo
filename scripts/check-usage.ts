// Check of the reconciliation with OpenRouter (#28) and of who decides an automatic pass (#91). Not a test framework: assert.
//   npm run check:usage
import assert from "node:assert/strict";
import { drift } from "../lib/usage-check";
import { AUTO_SYSTEM_PER_DAY, BRAND_CHAIN_MS, autoBrandPass, autoSystemPass } from "../lib/usage-core";

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
console.log("check:usage ok");
