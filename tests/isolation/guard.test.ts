// The suite only protects what its table names. This finds every surface on disk that can read or write a
// workspace's data, and fails on any the table does not classify, and on any entry no longer on disk.
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "vitest";
import { TOOLS } from "@/lib/mcp/tools";
import { SURFACES } from "./surfaces";

const root = join(__dirname, "../..");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
}

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function discover(): string[] {
  const app = walk(join(root, "app")).map((f) => relative(root, f));
  const routes = app.filter((f) => f.endsWith("/route.ts")).flatMap((f) => {
    const src = readFileSync(join(root, f), "utf8");
    const named = [...src.matchAll(/^export (?:(?:async )?function|const) (\w+)/gm)].map((m) => m[1]);
    const destructured = [...src.matchAll(/^export const \{([^}]+)\}/gm)].flatMap((m) => m[1].split(",").map((s) => s.trim()));
    return [...named, ...destructured].filter((m) => METHODS.includes(m)).map((m) => `route:${f}#${m}`);
  });
  const actions = app.filter((f) => /^app\/actions\/[^/]+\.ts$/.test(f)).flatMap((f) =>
    [...readFileSync(join(root, f), "utf8").matchAll(/^export async function (\w+)/gm)].map((m) => `action:${f}#${m[1]}`));
  const tools = TOOLS.map((t) => `mcp:${t.name}`);
  const pages = app.filter((f) => f.endsWith("/page.tsx") && f.includes("[")).map((f) => `page:${f}`);
  return [...routes, ...actions, ...tools, ...pages];
}

test("every surface on disk is in the isolation table, and every entry is on disk", () => {
  const found = discover();
  const table = Object.keys(SURFACES);
  expect(found.length, "the discovery finds surfaces").toBeGreaterThan(100);
  expect(found.filter((s) => !table.includes(s)), "surfaces missing from tests/isolation/surfaces.ts: add a probe or an exemption").toEqual([]);
  expect(table.filter((s) => !found.includes(s)), "entries in tests/isolation/surfaces.ts no longer on disk").toEqual([]);
});
