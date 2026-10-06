// Everything a brand hands out, in one zip: the logo files as they were given plus PNGs at two sizes, the icons a
// site or an app needs (favicon, apple touch, 512), the tokens in three formats, criterio.md, the uploaded fonts when
// the team allows it, and a README that says what is what and where the other faces come from.
import "server-only";
import sharp from "sharp";
import { getFile } from "./storage";
import { brandKeyAllowed } from "./brand-files";
import { zip, type ZipEntry } from "./zip";
import { fileStem, fontLinks, tailwindTheme, tokensCss, tokensJson } from "./brand-export";
import type { BrandFile, BrandSpec } from "@/types/brand";

const ext = (f: BrandFile) => (f.type === "image/svg+xml" ? "svg" : f.type === "image/jpeg" ? "jpg" : f.type.split("/")[1] ?? "bin");

/** A logo as a PNG of this width, on a transparent ground */
async function png(body: Buffer, width: number): Promise<Buffer | null> {
  try { return await sharp(body, { density: 300 }).resize({ width, withoutEnlargement: false }).png().toBuffer(); } catch { return null; }
}
/** A square icon: the mark centred on its ground with a margin */
async function icon(body: Buffer, size: number, ground: string): Promise<Buffer | null> {
  try {
    const inner = Math.round(size * 0.66);
    const mark = await sharp(body, { density: 300 }).resize({ width: inner, height: inner, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
    return await sharp({ create: { width: size, height: size, channels: 4, background: ground } }).composite([{ input: mark, gravity: "center" }]).png().toBuffer();
  } catch { return null; }
}

export async function brandZip(organizationId: string, brand: BrandSpec, name: string, markdown: string): Promise<{ file: Buffer; fileName: string }> {
  const stem = fileStem(name);
  const entries: ZipEntry[] = [];
  // Only the workspace's own files go in, whatever the stored brand says
  const fetchKey = async (key: string) => (brandKeyAllowed(organizationId, key) ? (await getFile(key).catch(() => null))?.body ?? null : null);
  const read = async (f: BrandFile | null) => (f ? fetchKey(f.key) : null);
  const logos: [string, BrandFile | null][] = [["logo-light", brand.logo.primary.light], ["logo-dark", brand.logo.primary.dark], ["mark-light", brand.logo.mark.light], ["mark-dark", brand.logo.mark.dark]];
  let iconSource: Buffer | null = null;
  for (const [slot, f] of logos) {
    const body = await read(f);
    if (!f || !body) continue;
    entries.push({ name: `logo/${stem}-${slot}.${ext(f)}`, data: body });
    for (const w of [1024, 2048]) { const p = await png(body, w); if (p) entries.push({ name: `logo/png/${stem}-${slot}@${w}.png`, data: p }); }
    if (!iconSource && slot.startsWith("mark-light")) iconSource = body;
  }
  iconSource ??= await read(brand.logo.mark.dark) ?? await read(brand.logo.primary.light) ?? await read(brand.logo.primary.dark);
  if (iconSource) {
    const neutrals = brand.color.items.filter((c) => c.group === "neutral");
    const ground = neutrals.find((c) => c.weight === 4)?.hex ?? "#FFFFFF";
    for (const [n, size] of [["favicon-32", 32], ["apple-touch-icon-180", 180], ["icon-512", 512]] as const) { const p = await icon(iconSource, size, ground); if (p) entries.push({ name: `icons/${n}.png`, data: p }); }
  }
  entries.push({ name: `tokens/${stem}-tokens.css`, data: Buffer.from(tokensCss(brand, name)) });
  entries.push({ name: `tokens/${stem}-tokens.json`, data: Buffer.from(tokensJson(brand)) });
  entries.push({ name: `tokens/${stem}-tailwind.css`, data: Buffer.from(tailwindTheme(brand, name)) });
  entries.push({ name: `${stem}-criterio.md`, data: Buffer.from(markdown) });
  if (brand.assets.includeFonts) for (const face of brand.typography.faces) for (const f of face.files ?? []) {
    const body = await fetchKey(f.key);
    if (body) entries.push({ name: `fonts/${fileStem(face.family)}-${f.weight}${f.style === "italic" ? "-italic" : ""}.${f.key.split(".").pop()}`, data: body });
  }
  for (const f of brand.assets.files) { const body = await read(f); if (body) entries.push({ name: `files/${f.name ?? `${stem}.${ext(f)}`}`, data: body }); }
  const fonts = fontLinks(brand);
  entries.push({ name: "README.md", data: Buffer.from([
    `# ${name}`, "",
    "- `logo/`: the logo files as they were given, and PNGs at 1024 and 2048 px wide.",
    "- `icons/`: favicon, Apple touch icon and a 512 px icon, from the mark.",
    "- `tokens/`: the brand's values as CSS variables, W3C design tokens and a Tailwind v4 theme.",
    `- \`${stem}-criterio.md\`: every decision and value, for a person or an AI agent.`,
    ...(fonts.length ? ["", "## Typefaces", "", ...fonts.map((f) => `- ${f.family}: ${f.href ?? (f.note === "upload" ? (brand.assets.includeFonts ? "in fonts/" : "licensed files, ask the brand's owner") : "not publicly served")}`)] : []),
    "", "Made with criterio.design", "",
  ].join("\n")) });
  return { file: zip(entries), fileName: `${stem}-brand.zip` };
}
