// Satoshi comes from Fontshare under the ITF Free Font License: we may self-host it on our own site,
// but not share the files through a public repository (this one is public). So the file stays out of git
// and this script downloads the official one before `dev` and `build`. It only copies it: the licence
// forbids subsetting or converting. A file already on disk is kept. Paths are relative to this file, so
// it runs the same from the repo root or from marketing-site/ (Cloudflare builds from either).
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "fonts", "Satoshi-Variable.woff2");
const exists = await access(target).then(() => true, () => false);

if (!exists) {
  const css = await (await fetch("https://api.fontshare.com/v2/css?f[]=satoshi@1&display=swap")).text();
  const src = css.match(/url\('([^']+)'\) format\('woff2'\)/)?.[1];
  if (!src) throw new Error("Fontshare: no woff2 file for satoshi@1");
  const res = await fetch(src.startsWith("//") ? `https:${src}` : src);
  if (!res.ok) throw new Error(`Fontshare: ${res.status} for satoshi@1`);
  const data = Buffer.from(await res.arrayBuffer());
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, data);
  console.log(`fonts: Satoshi-Variable.woff2 (${Math.round(data.length / 1024)} KB)`);
}
