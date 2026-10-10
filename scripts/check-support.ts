// Checks, with no model and no database, that the board's signals are counted and reach criterio.md:
// the tally of a board, the support a run stores for the signals it names, and the line the file writes.
//   npx tsx --conditions=react-server scripts/check-support.ts
import assert from "node:assert/strict";
import { signalTally, supportOf } from "../lib/system";
import { blocksToMd, criterioBlocks, readAreaMeta } from "../lib/criterio-md";
import { emptySystem, SYSTEM_AREAS, type SystemArea } from "../types/system";
import en from "../lib/i18n/en";

const refs = Array.from({ length: 40 }, (_, i) => ({
  code: `r${i + 1}`,
  signals: (i < 12 ? { typography: ["geometric-sans"], color: ["dark-one-accent"] } : i < 15 ? { typography: ["display-serif-high-contrast"] } : {}) as Partial<Record<SystemArea, string[]>>,
}));
const tally = signalTally(refs);
assert.equal(tally.of, 40);
assert.deepEqual(tally.areas.typography?.map((x) => [x.signal, x.refs.length]), [["geometric-sans", 12], ["display-serif-high-contrast", 3]]);
assert.equal(tally.areas.layout, undefined, "an area no reference shows is not in the tally");

const idOf = new Map(refs.map((r, i) => [r.code, `item${i + 1}`]));
const support = supportOf("typography", ["geometric-sans", "dark-one-accent", "oversized-headlines"], tally, idOf);
assert.deepEqual(support.map((x) => [x.signal, x.itemIds.length, x.of]), [["geometric-sans", 12, 40]], "another area's key and a key nobody shows are dropped");

const system = emptySystem("p1");
system.areas = system.areas.map((a) => (a.area === "typography" ? { ...a, decision: "Headlines in a geometric sans at 500.", source: "team", confidence: 90, support } : a));
const items = Object.fromEntries(refs.map((_, i) => [`item${i + 1}`, { name: `Site ${i + 1}`, web: `https://site${i + 1}.example` }]));
const labels = Object.fromEntries(SYSTEM_AREAS.map((a) => [a, a])) as Record<SystemArea, string>;
const blocks = criterioBlocks({ project: "Check", system, items, labels, strings: en.system.md, board: refs.map((_, i) => `item${i + 1}`) });
const area = blocks.find((b) => b.kind === "area" && b.area === "typography");
assert.ok(area && area.kind === "area" && area.support?.length === 1);
assert.equal(area.support![0].refs.length, 12, "the line opens to the 12 references");
const md = blocksToMd(blocks);
const line = md.split("\n").find((l) => l.startsWith("- **Backed by:**"));
assert.equal(line, "- **Backed by:** Geometric sans, in 12 of 40 references (R1, R2, R3, R4, R5, R6, R7, R8, R9, R10, R11, R12)");
assert.deepEqual(readAreaMeta(line!, en.system.md).refs, [], "the support line is never read back as the area's references");
const open = blocks.find((b) => b.kind === "area" && b.area === "color");
assert.ok(open && open.kind === "area" && !open.support, "an open area says nothing of support");
console.log("support ok:", line);
