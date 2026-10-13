// A brand that already exists, brought into a project's presentation by an AI client (the bring_brand tool in
// lib/mcp/tools.ts): the sections of types/brand.ts as an agent passes them, written the way a measured site or a
// pasted guide is written (lib/brand-store.ts, src "import"), so the team edits them in the app and a run reads
// them. What only the app can make is made here: a logo or an imagery picture arrives as SVG markup, a public
// address or its bytes as base64 and becomes a brand file; the guide the agent wrote is kept with the brand for
// the next passes.
import "server-only";
import { z } from "zod";
import { HttpError } from "../workspace-core";
import { fetchFile } from "../remote-file";
import { putFile, deleteFiles } from "../storage";
import { inspectBrandFile, imageTypeOf, newBrandKey, projectBrandPrefix, MAX_BRAND_BYTES, type BrandPurpose } from "../brand-files";
import { storeGuide, GUIDE_MAX } from "../brand-guides";
import { getBrand, writeBrandSections } from "../brand-store";
import {
  ApplicationsSchema, BRAND_SECTIONS, BrandColorSchema, BrandFaceSchema, ColorSchema, ImagerySchema, IntroSchema, LogoSchema,
  MotionSchema, TypographySchema, VoiceSchema, runMayWrite, type BrandFile, type BrandSections, type BrandSpec,
} from "@/types/brand";
import type { McpCtx } from "./auth";
import { ProjectArg, projectUrl, resolveProject } from "./pieces";

/** A file as an agent can hand it over: markup it read, an address it knows, or bytes it has on disk */
const FileIn = z.object({
  svg: z.string().max(200_000).optional().describe("The file's SVG markup, whole. Pass svg, url or data."),
  url: z.string().max(2000).optional().describe("A public address of the file as SVG, PNG, WebP or JPEG. Pass svg, url or data."),
  data: z.string().max(1_400_000).optional().describe("The file as base64, when it is on your disk (a capture, a file in the repo): PNG, WebP or JPEG. Pass svg, url or data."),
  name: z.string().max(200).optional().describe("The file's name as the team sees it."),
}).refine((f) => [f.svg, f.url, f.data].filter(Boolean).length === 1, "Pass svg, url or data: one of them, not none.");
type FileIn = z.infer<typeof FileIn>;
const LogoPairIn = z.object({ light: FileIn.nullable().describe("On a light ground; null for none."), dark: FileIn.nullable().describe("On a dark ground; null for none.") });

/** What an agent passes: the brand's sections minus what only the app can make (storage keys) */
export const BringInput = z.object({
  project: ProjectArg,
  source: z.string().min(1).max(200).describe("Where the values were read from, in a line: the repo, the site, the guide. The team sees it with the brand."),
  guide: z.string().max(GUIDE_MAX).optional().describe("The DESIGN.md or guidelines you wrote, whole: kept with the brand and read by the app's next passes, for what the sections have no place for (components, spacing, radius, elevation, do and don't rules)."),
  intro: IntroSchema.optional().describe("The brand in a line and a few paragraphs, as the presentation opens."),
  logo: LogoSchema.extend({
    primary: LogoPairIn.describe("The full logo, one per ground it sits on."),
    mark: LogoPairIn.describe("The mark alone (the symbol, the monogram), one per ground."),
  }).optional().describe("The logo files, light and dark, with their clear space and smallest size."),
  color: ColorSchema.extend({ items: z.array(BrandColorSchema.omit({ unmeasured: true })).max(16) }).optional().describe("The palette: each colour with its hex, role, group and weight."),
  typography: TypographySchema.extend({ faces: z.array(BrandFaceSchema.omit({ files: true })).max(4) }).optional().describe("The faces that load and the type scale set in them."),
  motion: MotionSchema.optional().describe("The curves and durations things move with."),
  voice: VoiceSchema.optional().describe("How the brand writes: principles and do/don't pairs."),
  imagery: ImagerySchema.omit({ files: true }).extend({
    images: z.array(FileIn).max(9).optional().describe("The brand's own pictures that show the imagery best: the site's hero captures, its illustrations, its photographs, by public address or as base64. They become the section's examples next to the references in itemIds."),
  }).optional().describe("How the pictures look, what they never do, the references that show it and the brand's own pictures."),
  applications: ApplicationsSchema.omit({ heroFile: true }).optional().describe("Where the brand shows up: domain, handle, tagline, bio."),
});
export type BringIn = z.infer<typeof BringInput>;

const FILE_TYPES: Record<string, string> = { "image/svg+xml": "svg", "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" };
const LOGO_SLOTS = [["primary", "light"], ["primary", "dark"], ["mark", "light"], ["mark", "dark"]] as const;
/** The sections whose values are files this tool stores */
const FILE_SECTIONS = ["logo", "imagery"] as const;
type FileSection = (typeof FILE_SECTIONS)[number];
const REFUSED: Record<"missing" | "type" | "unsafe", string> = {
  missing: "it could not be stored",
  type: "its bytes are not the image its address says",
  unsafe: "the SVG runs or fetches something (a script, an event handler, a link out); it is refused, not cleaned",
};

/** The file's bytes and type from whichever the slot carries; an HttpError when they cannot be read */
async function readFileIn(slot: FileIn, where: string): Promise<{ body: Buffer; type: string }> {
  if (slot.svg) return { body: Buffer.from(slot.svg, "utf8"), type: "image/svg+xml" };
  if (slot.data) {
    // The type is what the bytes say, never what the agent says
    const body = Buffer.from(slot.data.replace(/^data:[^,]*,/, ""), "base64");
    const type = imageTypeOf(body);
    if (!type) throw new HttpError(415, `The ${where} passed as data is not a PNG, WebP or JPEG.`);
    return { body, type };
  }
  const got = await fetchFile(slot.url!, undefined, (t) => t in FILE_TYPES, MAX_BRAND_BYTES);
  if (!got) throw new HttpError(400, `The ${where} at ${slot.url} could not be fetched as an SVG, PNG, WebP or JPEG of at most ${MAX_BRAND_BYTES / 1024 / 1024} MB.`);
  return got;
}

/** One file of the brand, stored and checked; an HttpError when it cannot be */
async function storeFile(org: string, projectId: string, kind: BrandPurpose, slot: FileIn, where: string): Promise<BrandFile> {
  const got = await readFileIn(slot, where);
  const key = newBrandKey(org, projectId, kind, `${kind}.${FILE_TYPES[got.type]}`);
  await putFile(key, got.body, got.type, org);
  const file = await inspectBrandFile(key, got.type, slot.name);
  if (typeof file === "string") {
    await deleteFiles([key]);
    throw new HttpError(415, `The ${where} was refused: ${REFUSED[file]}.`);
  }
  return file;
}

const logoKeys = (logo: BrandSpec["logo"]) => LOGO_SLOTS.map(([v, g]) => logo[v][g]?.key).filter((k): k is string => !!k);

export async function bringBrand(ctx: McpCtx, origin: string, input: BringIn) {
  const project = await resolveProject(ctx, input.project);
  const org = project.workspace.id;
  const { project: _p, source, guide, logo, imagery, applications, ...plain } = input;
  const sections: Partial<BrandSections> = {
    ...plain,
    ...(applications ? { applications: { ...applications, heroFile: null } } : {}),
  };
  const asked = BRAND_SECTIONS.filter((k) => k !== "assets" && input[k] !== undefined);
  const current = await getBrand(org, project.id);
  const prefix = projectBrandPrefix(org, project.id);
  // The team's files are theirs: nothing is uploaded for a section that will not be written
  const stored: Record<FileSection, string[]> = { logo: [], imagery: [] };
  const keep = (k: FileSection, file: BrandFile) => { stored[k].push(file.key); return file; };
  try {
    if (logo && runMayWrite(current, "logo")) {
      const pairs: Record<"primary" | "mark", { light: BrandFile | null; dark: BrandFile | null }> = { primary: { light: null, dark: null }, mark: { light: null, dark: null } };
      for (const [v, g] of LOGO_SLOTS) {
        const slot = logo[v][g];
        if (slot) pairs[v][g] = keep("logo", await storeFile(org, project.id, "logo", slot, `${v} ${g} logo`));
      }
      sections.logo = { ...logo, ...pairs };
    }
    if (imagery && runMayWrite(current, "imagery")) {
      const { images = [], ...rest } = imagery;
      const files: BrandFile[] = [];
      for (const [i, image] of images.entries()) files.push(keep("imagery", await storeFile(org, project.id, "image", image, `imagery picture ${i + 1}`)));
      sections.imagery = { ...rest, files };
    }
  } catch (e) { await deleteFiles([...stored.logo, ...stored.imagery]); throw e; }
  const key = guide ? await storeGuide(org, project.id, guide) : undefined;
  const written = await writeBrandSections(org, project.id, sections, "import", {
    source: { kind: guide ? "text" : "files", label: source, ...(key ? { key } : {}), at: new Date().toISOString(), by: ctx.user.name || ctx.user.email },
  });
  // Nothing stays in storage that the brand no longer points at: the files the write replaced, or the ones
  // uploaded for a section the team took meanwhile, and the guide this same source brought last time
  const old: Record<FileSection, string[]> = { logo: logoKeys(current.logo), imagery: current.imagery.files.map((f) => f.key) };
  const gone = FILE_SECTIONS.flatMap((k) => (written.includes(k) ? old[k].filter((x) => x.startsWith(prefix)) : stored[k]));
  const oldGuide = key ? current.sources.find((s) => s.kind === "text" && s.label === source && s.key?.startsWith(prefix))?.key : undefined;
  await deleteFiles([...gone, ...(oldGuide ? [oldGuide] : [])]);
  const kept = asked.filter((k) => !written.includes(k));
  return {
    project: project.name,
    written,
    ...(kept.length ? {
      kept_by_team: kept,
      kept_by_team_note: "The team set these sections by hand, so they were left as they are. They can hand a section back in the app (Sistema, Presentación), and the next call writes it.",
    } : {}),
    guide_kept: !!key,
    status: "The values are on the project's presentation (Sistema, Presentación). The team edits them there; Improve with AI reads them with the board.",
    url: projectUrl(origin, project.id),
  };
}
