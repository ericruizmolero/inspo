// Satoshi comes from Fontshare under the ITF Free Font License: we may self-host it for our own app,
// but not share the files through a public repository (this one is public). So the files stay out of
// git and this script downloads the official ones before `dev` and `build` (predev, prebuild). It only
// copies them: the licence forbids subsetting or converting them. Files already on disk are kept.
import { mkdir, writeFile, access } from "node:fs/promises";
import { dirname } from "node:path";

const FILES = [
  { query: "satoshi@1", format: "woff2", to: ["app/fonts/satoshi/Satoshi-Variable.woff2", "extension/chrome/fonts/Satoshi-Variable.woff2"] },
  { query: "satoshi@2", format: "woff2", to: ["app/fonts/satoshi/Satoshi-VariableItalic.woff2"] },
  // The share card (app/opengraph-image.tsx) draws with Satori, which reads TTF and not variable fonts
  { query: "satoshi@400", format: "truetype", to: ["app/fonts/satoshi/Satoshi-Regular.ttf"] },
  { query: "satoshi@700", format: "truetype", to: ["app/fonts/satoshi/Satoshi-Bold.ttf"] },
];

const exists = (path) => access(path).then(() => true, () => false);

for (const file of FILES) {
  const missing = [];
  for (const path of file.to) if (!(await exists(path))) missing.push(path);
  if (!missing.length) continue;

  const css = await (await fetch(`https://api.fontshare.com/v2/css?f[]=${file.query}&display=swap`)).text();
  const src = css.match(new RegExp(`url\\('([^']+)'\\) format\\('${file.format}'\\)`))?.[1];
  if (!src) throw new Error(`Fontshare: no ${file.format} file for ${file.query}`);
  const res = await fetch(src.startsWith("//") ? `https:${src}` : src);
  if (!res.ok) throw new Error(`Fontshare: ${res.status} for ${file.query}`);
  const data = Buffer.from(await res.arrayBuffer());

  for (const path of missing) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data);
    console.log(`fonts: ${path} (${Math.round(data.length / 1024)} KB)`);
  }
}
