// Writing the brand's values (types/brand.ts). The team saves one section at a time from the presentation; a run,
// a site's measurements or an imported guide write several at once. A section the team set by hand is theirs: only
// they write over it, until they hand it back. Two people saving the same section at once: the second is told the
// section moved on (409) and reads it again, instead of erasing the first one's work.
import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError } from "./workspace-core";
import { getErrors } from "./i18n";
import { BRAND_SECTIONS, SECTION_SCHEMAS, readBrand, type BrandSection, type BrandSections, type BrandSource, type BrandSpec, type BrandSrc } from "@/types/brand";
import type { ProjectSystem } from "@/types/system";
import { getSystem } from "./system";
import { brandKeyAllowed, keysIn } from "./brand-files";
import { log } from "./log";

const S = schema.projectSystem;
const P = schema.project;

async function ownProject(organizationId: string, projectId: string) {
  const [row] = await db.select({ id: P.id }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!row) throw new HttpError(404, (await getErrors()).projectNotFound);
}

const isSection = (k: string): k is BrandSection => (BRAND_SECTIONS as readonly string[]).includes(k);

/** Reads the brand inside a transaction with the row locked, hands it to `fn` and writes what `fn` returns */
async function withBrand(organizationId: string, projectId: string, fn: (brand: BrandSpec) => BrandSpec | Promise<BrandSpec>): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(S).values({ projectId, organizationId, summary: "", runJson: null, createdAt: now, updatedAt: now }).onConflictDoNothing();
    const [row] = await tx.select({ brand: S.brand }).from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId))).for("update").limit(1);
    const next = await fn(readBrand(row?.brand));
    await tx.update(S).set({ brand: next, updatedAt: now }).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId)));
  });
}

/**
 * The team saves a section from the presentation. `baseAt` is when the section they edited was last written (its
 * meta.at as they read it): if someone wrote it since, nothing is saved and they are told to read it again.
 */
export async function saveBrandSection(organizationId: string, projectId: string, section: string, value: unknown, baseAt: string | null, userId: string): Promise<{ system: ProjectSystem; conflict: boolean }> {
  await ownProject(organizationId, projectId);
  const errors = await getErrors();
  if (!isSection(section)) throw new HttpError(400, errors.badBody);
  const parsed = SECTION_SCHEMAS[section].safeParse(value);
  if (!parsed.success) throw new HttpError(400, errors.badBody);
  if (keysIn(parsed.data).some((k) => !brandKeyAllowed(organizationId, k))) throw new HttpError(400, errors.badBody);
  let conflict = false;
  await withBrand(organizationId, projectId, (brand) => {
    const at = brand.meta[section]?.at ?? null;
    if (at !== (baseAt ?? null)) { conflict = true; return brand; }
    return { ...brand, [section]: parsed.data, meta: { ...brand.meta, [section]: { src: "team", by: userId, at: new Date().toISOString() } } };
  });
  return { system: await getSystem(organizationId, projectId), conflict };
}

/** The team hands a section back: its values stay, the next run may change them */
export async function releaseBrandSection(organizationId: string, projectId: string, section: string): Promise<ProjectSystem> {
  await ownProject(organizationId, projectId);
  if (!isSection(section)) throw new HttpError(400, (await getErrors()).badBody);
  await withBrand(organizationId, projectId, (brand) => {
    const m = brand.meta[section];
    if (m?.src !== "team") return brand;
    return { ...brand, meta: { ...brand.meta, [section]: { src: "model", by: null, at: new Date().toISOString() } } };
  });
  return getSystem(organizationId, projectId);
}

/**
 * Sections written by a run, a site or a guide. What the team set by hand stays, unless `force` names it (a person
 * asked for that section to be redone). Returns which sections were written.
 */
export async function writeBrandSections(organizationId: string, projectId: string, sections: Partial<BrandSections>, src: Exclude<BrandSrc, "team">, opts: { force?: BrandSection[]; source?: BrandSource; run?: BrandSpec["run"] } = {}): Promise<BrandSection[]> {
  const written: BrandSection[] = [];
  await withBrand(organizationId, projectId, (brand) => {
    const next = { ...brand, meta: { ...brand.meta } } as BrandSpec;
    const at = new Date().toISOString();
    for (const k of BRAND_SECTIONS) {
      const v = sections[k];
      if (v === undefined) continue;
      if (brand.meta[k]?.src === "team" && !opts.force?.includes(k)) continue;
      const parsed = SECTION_SCHEMAS[k].safeParse(v);
      if (!parsed.success) { log.warn("brand.section_refused", { section: k, issues: parsed.error.issues.slice(0, 3) }); continue; }
      if (keysIn(parsed.data).some((key) => !brandKeyAllowed(organizationId, key))) { log.warn("brand.section_refused", { section: k, reason: "a file outside the workspace" }); continue; }
      (next as unknown as Record<string, unknown>)[k] = parsed.data;
      next.meta[k] = { src, by: null, at };
      written.push(k);
    }
    if (opts.source) next.sources = [...brand.sources.filter((s) => !(s.kind === opts.source!.kind && s.label === opts.source!.label)), opts.source].slice(-12);
    if (opts.run !== undefined) next.run = opts.run;
    return next;
  });
  return written;
}

/** The brand as stored, for the server's own readers (the run, the share) */
export async function getBrand(organizationId: string, projectId: string): Promise<BrandSpec> {
  const [row] = await db.select({ brand: S.brand }).from(S).where(and(eq(S.organizationId, organizationId), eq(S.projectId, projectId))).limit(1);
  return readBrand(row?.brand);
}

/** A redesign: the reference that is the client's current site, when the brief names one */
export async function projectClient(organizationId: string, projectId: string): Promise<{ itemId: string; web: string; name: string } | null> {
  const [row] = await db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  const id = row?.brief?.clientItemId;
  if (!id) return null;
  const T = schema.inspoItem;
  const [item] = await db.select({ id: T.id, web: T.web, name: T.name }).from(T).where(and(eq(T.organizationId, organizationId), eq(T.id, id))).limit(1);
  return item ? { itemId: item.id, web: item.web, name: item.name } : null;
}
