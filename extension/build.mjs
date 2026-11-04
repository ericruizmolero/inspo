// Packs extension/chrome for the Chrome Web Store: same files, minus the localhost entries
// that only serve local testing. Output: extension/dist/criterio-design-<version>.zip
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "chrome");
const manifest = JSON.parse(readFileSync(join(src, "manifest.json"), "utf8"));
const notLocal = (s) => !/^https?:\/\/localhost\b/.test(s);
manifest.host_permissions = manifest.host_permissions.filter(notLocal);
for (const cs of manifest.content_scripts) cs.matches = cs.matches.filter(notLocal);

const dist = join(here, "dist");
const stage = join(dist, `criterio-design-${manifest.version}`);
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
cpSync(src, stage, { recursive: true, filter: (p) => !/\.DS_Store$/.test(p) });
writeFileSync(join(stage, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

const zip = join(dist, `criterio-design-${manifest.version}.zip`);
rmSync(zip, { force: true });
execFileSync("zip", ["-qr", zip, "."], { cwd: stage });
rmSync(stage, { recursive: true, force: true });
console.log(`${zip}\nversion ${manifest.version} · host_permissions ${JSON.stringify(manifest.host_permissions)}`);
