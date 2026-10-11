// #20: every write names its workspace. The system's functions check the project before they write, so B's calls
// never reach these statements and no probe can see a missing filter. This reads the source instead: every update
// and delete on an area's tables carries `organizationId` in its statement.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const root = join(__dirname, "../..");
const FILES = [...readdirSync(join(root, "lib/system")).map((f) => `lib/system/${f}`), "lib/area-comments.ts"];

function unfiltered(file: string): string[] {
  const src = readFileSync(join(root, file), "utf8");
  return [...src.matchAll(/\b(?:db|tx)\.(?:update|delete)\(/g)].flatMap((m) => {
    const statement = src.slice(m.index, src.indexOf(";", m.index));
    return statement.includes("organizationId") ? [] : [`${file}:${src.slice(0, m.index).split("\n").length}`];
  });
}

test("every update and delete of the system and its comments filters by workspace", () => {
  const writes = FILES.flatMap((f) => [...readFileSync(join(root, f), "utf8").matchAll(/\b(?:db|tx)\.(?:update|delete)\(/g)]);
  expect(writes.length, "the scan finds the writes").toBeGreaterThan(4);
  expect(FILES.flatMap(unfiltered), "writes without eq(X.organizationId, …)").toEqual([]);
});
