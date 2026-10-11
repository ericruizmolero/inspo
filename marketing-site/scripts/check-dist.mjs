// Checks the built site in dist/ (run after `npm run build`): every page has a title, a canonical on its own
// address and the three hreflang links; every internal link, script, stylesheet and image resolves to a file;
// the sitemap lists every page and nothing else. Exits 1 with the list of what failed.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const SITE = "https://criterio.design";
const failures = [];
const fail = (where, what) => failures.push(`${where}: ${what}`);

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const pages = walk(dist).filter((p) => p.endsWith(".html") && !p.endsWith("404.html"));
const addressOf = (file) => "/" + relative(dist, file).replace(/index\.html$/, "");

/** An internal address (no host, or this site's) as a file in dist, or null when nothing there answers it */
const fileFor = (href) => {
  const path = decodeURI(new URL(href, SITE).pathname);
  const candidates = path.endsWith("/") ? [join(dist, path, "index.html")] : [join(dist, path), join(dist, path, "index.html")];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
};

for (const file of pages) {
  const html = readFileSync(file, "utf8");
  const at = addressOf(file);
  if (!/<title>[^<]+<\/title>/.test(html)) fail(at, "no title");
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  if (canonical !== SITE + at) fail(at, `canonical is ${canonical}`);
  const langs = [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)];
  if (langs.map((m) => m[1]).join() !== "en,es,x-default") fail(at, `hreflang ${langs.map((m) => m[1]).join() || "missing"}`);
  for (const [, , href] of langs) if (!fileFor(href)) fail(at, `hreflang to ${href} has no page`);
  if (!langs.some(([, , href]) => href === SITE + at)) fail(at, "no hreflang points back at itself");
  for (const [, attr, href] of html.matchAll(/\s(href|src)="([^"]+)"/g)) {
    if (/^(mailto:|#|data:)/.test(href)) continue;
    const url = new URL(href, SITE + at);
    if (url.origin !== SITE) continue;
    if (!fileFor(url.href)) fail(at, `${attr} ${href} does not resolve`);
  }
}

const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
const listed = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const built = new Set(pages.map((p) => SITE + addressOf(p)));
for (const u of built) if (!listed.has(u)) fail("sitemap.xml", `misses ${u}`);
for (const u of listed) if (!built.has(u)) fail("sitemap.xml", `lists ${u}, which was not built`);

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`${pages.length} pages: title, canonical, hreflang and internal links fine; the sitemap lists all ${listed.size}`);
