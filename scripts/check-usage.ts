// Check of the reconciliation with OpenRouter (#28). Not a test framework: assert.
//   npm run check:usage
import assert from "node:assert/strict";
import { drift } from "../lib/usage-check";

assert.equal(drift(10, 10.05), null);            // 0.5%: matches
assert.equal(drift(0.004, 0.012), null);         // under a cent: noise
assert.ok((drift(10, 10.5) ?? 0) > 0.01);        // 4.8%: warns
assert.ok((drift(0, 1) ?? 0) === 1);             // we logged nothing: warns
console.log("check:usage ok");
