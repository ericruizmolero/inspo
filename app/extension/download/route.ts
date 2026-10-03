// The extension as a zip, to install it by hand (/extension/install) while it is not in the
// Chrome Web Store. Same contents as the store upload (extension/build.mjs): extension/chrome
// minus the localhost entries, which only serve local testing.
// Built once, at build time: the folder is read from the repo, not from the deployed function.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { zip, type ZipEntry } from "@/lib/zip";

export const dynamic = "force-static";

const notLocal = (s: string) => !/^https?:\/\/localhost\b/.test(s);

async function read(dir: string, prefix = ""): Promise<ZipEntry[]> {
  const out: ZipEntry[] = [];
  const entries = (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  for (const e of entries) {
    if (e.name === ".DS_Store") continue;
    if (e.isDirectory()) out.push(...(await read(join(dir, e.name), `${prefix}${e.name}/`)));
    else out.push({ name: prefix + e.name, data: await readFile(join(dir, e.name)) });
  }
  return out;
}

export async function GET() {
  const files = await read(join(process.cwd(), "extension", "chrome"));
  const manifest = files.find((f) => f.name === "manifest.json");
  if (!manifest) return new Response("manifest.json is missing", { status: 500 });
  const m = JSON.parse(manifest.data.toString("utf8"));
  m.host_permissions = m.host_permissions.filter(notLocal);
  for (const cs of m.content_scripts) cs.matches = cs.matches.filter(notLocal);
  manifest.data = Buffer.from(JSON.stringify(m, null, 2) + "\n");

  return new Response(new Uint8Array(zip(files)), {
    headers: {
      "Content-Type": "application/zip",
      // No version in the name: unzipping a newer one lands on the same folder, which is what Chrome reloads
      "Content-Disposition": 'attachment; filename="criterio-extension.zip"',
    },
  });
}
