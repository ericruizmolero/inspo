// Check of the three address normalizers unified into lib/url.ts (webKeyOf):
// item dedup used a version with no hash, DESIGN.md storage (keyFor) lowercased
// the whole string, the screenshot store (shotKey) only trimmed. Reimplemented
// here, read-only, to size how often the old three actually disagreed.
// Not a test framework: assert.
//   npm run check:url-keys
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" }); loadEnv();
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { db, schema } from "../lib/db";
import { webKeyOf } from "../lib/url";

// ── The three old normalizers, as they were before unifying ────────────────
const oldWebKeyOf = (raw: string): string => {
  const s = raw.trim().replace(/\/+$/, "");
  try {
    const u = new URL(s);
    return `${u.protocol}//${u.host.toLowerCase()}${u.pathname.replace(/\/+$/, "")}${u.search}`;
  } catch {
    return s.toLowerCase();
  }
};
const oldKeyFor = (url: string): string =>
  url.trim().replace(/\/+$/, "").toLowerCase();
const oldShotKey = (url: string): string => url.trim();

const OLD = { "item dedup": oldWebKeyOf, "DESIGN.md store": oldKeyFor, "screenshot store": oldShotKey };

// Sanity check on the new, single function: it treats case and trailing-slash
// variants of the same address as one, and doesn't choke on garbage input.
assert.equal(webKeyOf("HTTPS://Example.com/Foo/"), webKeyOf("https://example.com/foo"));
assert.equal(webKeyOf("example.com/foo/"), webKeyOf(" example.com/foo "));
assert.equal(webKeyOf("not a url"), "not a url");

async function main() {
  const rows = await db.selectDistinct({ web: schema.inspoItem.web }).from(schema.inspoItem);
  const urls = [...new Set(rows.map((r) => r.web).filter(Boolean))];

  // Group every saved address by each old normalizer. Two addresses in the same
  // group were treated as the same site by that normalizer.
  const groupOf = (fn: (u: string) => string) => {
    const key = new Map<string, string>();
    for (const u of urls) key.set(u, fn(u));
    return key;
  };
  const groups = Object.fromEntries(Object.entries(OLD).map(([name, fn]) => [name, groupOf(fn)]));
  const names = Object.keys(OLD);

  // A URL is mis-matched if any two of the three normalizers disagree on which
  // other saved URL(s) it's the same address as.
  const mismatched = new Set<string>();
  for (let i = 0; i < urls.length; i++) {
    for (let j = i + 1; j < urls.length; j++) {
      const [a, b] = [urls[i], urls[j]];
      const sameUnder = names.map((n) => groups[n].get(a) === groups[n].get(b));
      if (sameUnder.some((v) => v !== sameUnder[0])) {
        mismatched.add(a);
        mismatched.add(b);
      }
    }
  }

  const changedKey = urls.filter((u) => webKeyOf(u) !== oldWebKeyOf(u)).length;

  console.log(`✓ url-keys: ${urls.length} saved addresses checked`);
  console.log(`  ${mismatched.size} were keyed inconsistently across the three old normalizers${mismatched.size ? ":" : ""}`);
  for (const u of [...mismatched].slice(0, 20)) console.log(`    - ${u}`);
  if (mismatched.size > 20) console.log(`    ...and ${mismatched.size - 20} more`);
  console.log(`  ${changedKey} change their dedup key under the new, single normalizer (mostly self-healing: caches regenerate on next miss)`);
}

main().catch((e) => { console.error("✗", e); process.exitCode = 1; });
