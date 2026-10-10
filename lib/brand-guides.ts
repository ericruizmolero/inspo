// Guidelines the team pasted in (an old brand guide, a DESIGN.md, a criterio.md): kept as files of the project's
// brand and read by both passes, the system's and the brand's, as the brand's own word.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { getFile, putFile } from "./storage";
import { projectBrandPrefix } from "./brand-files";
import { readBrand, type BrandSpec } from "@/types/brand";
import { log } from "./log";

export const GUIDE_MAX = 60_000;
/** What the models read of them, all together */
const READ_MAX = 40_000;

/** What the models did not read of the guides: characters cut from the ones read, and whole guides left out */
export interface GuideCut { chars: number; dropped: number }
export interface Guides { texts: string[]; cut: GuideCut | null }

/** The one line that tells a model the guides it reads are not whole; null when nothing was cut */
export const guideCutLine = (cut: GuideCut | null | undefined) => cut
  ? `The guides were cut to fit: ${[cut.chars ? `${cut.chars} characters` : "", cut.dropped ? `${cut.dropped} older guide${cut.dropped > 1 ? "s" : ""}` : ""].filter(Boolean).join(" and ")} left out. What you read of them is not all the team brought.`
  : null;

/** The texts of the latest guides, newest first, cut to what the models read, and what the cut left out */
export async function guideTexts(brand: BrandSpec): Promise<Guides> {
  const all = brand.sources.filter((s) => s.kind === "text" && s.key).map((s) => s.key!);
  const keys = all.slice(-3).reverse();
  const texts = (await Promise.all(keys.map(async (k) => (await getFile(k).catch((err) => { log.warn("storage.read_failed", { ref: k, err }); return null; }))?.body.toString("utf8") ?? ""))).filter(Boolean);
  let room = READ_MAX;
  const read = texts.map((t) => { const cut = t.slice(0, Math.max(0, room)); room -= cut.length; return cut; });
  const chars = texts.reduce((n, t, i) => (read[i] ? n + t.length - read[i].length : n), 0);
  const dropped = all.length - keys.length + read.filter((t) => !t).length;
  return { texts: read.filter(Boolean), cut: chars || dropped ? { chars, dropped } : null };
}

export async function projectGuides(organizationId: string, projectId: string): Promise<Guides> {
  const S = schema.projectSystem;
  const [row] = await db.select({ brand: S.brand }).from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId))).limit(1);
  return guideTexts(readBrand(row?.brand));
}

/** Stores a pasted guide; returns its key */
export async function storeGuide(organizationId: string, projectId: string, text: string): Promise<string> {
  const key = `${projectBrandPrefix(organizationId, projectId)}guide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.md`;
  await putFile(key, Buffer.from(text.slice(0, GUIDE_MAX), "utf8"), "text/markdown; charset=utf-8");
  return key;
}
