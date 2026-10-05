"use server";
// The project's brand as values (types/brand.ts): the team saves a section from the presentation, hands one back to
// the model, or fills the brand from the client's site as its DESIGN.md measured it.
import { withCtx } from "@/lib/workspace";
import { HttpError } from "@/lib/workspace-core";
import { getErrors } from "@/lib/i18n";
import { saveBrandSection, releaseBrandSection, writeBrandSections, projectClient } from "@/lib/brand-store";
import { seedFromDesignMd } from "@/lib/brand-seed";
import { getDesignMd } from "@/lib/design-store";
import { getSystem } from "@/lib/system";
import { resolveFace } from "@/lib/brand-fonts";
import { inspectBrandFile, projectBrandPrefix } from "@/lib/brand-files";

/** Any member edits: the brand is the team's. `baseAt` is when the section was last written, as the editor read it */
export async function saveBrand(projectId: string, section: string, value: unknown, baseAt: string | null) {
  return withCtx(async (ctx) => saveBrandSection(ctx.workspace.id, String(projectId), String(section), value, baseAt ? String(baseAt) : null, ctx.user.id));
}

/** The values stay; the next run may change them */
export async function releaseBrand(projectId: string, section: string) {
  return withCtx(async (ctx) => releaseBrandSection(ctx.workspace.id, String(projectId), String(section)));
}

/** The client's site, as its DESIGN.md measured it, written over every section the team has not set by hand */
export async function seedBrandFromClient(projectId: string) {
  return withCtx(async (ctx) => {
    const id = String(projectId);
    const client = await projectClient(ctx.workspace.id, id);
    if (!client) throw new HttpError(400, (await getErrors()).badBody);
    const entry = await getDesignMd(client.web);
    if (!entry?.spec) throw new HttpError(409, (await getErrors()).badBody);
    const sections = await seedFromDesignMd(entry, client);
    await writeBrandSections(ctx.workspace.id, id, sections, "site", { source: { kind: "site", label: client.web, itemId: client.itemId, at: new Date().toISOString(), by: ctx.user.name } });
    return getSystem(ctx.workspace.id, id);
  });
}

/** Where a typeface can be loaded from, for the presentation's "add a typeface" */
export async function findBrandFace(projectId: string, family: string) {
  return withCtx(async (ctx) => {
    const client = await projectClient(ctx.workspace.id, String(projectId));
    return resolveFace(String(family).slice(0, 80), [400, 500, 600, 700], client?.web ?? null);
  });
}

/** An uploaded file, checked (its bytes, an SVG's safety) and measured, for the brand to point at */
export async function attachBrandFile(projectId: string, key: string, type: string, name?: string) {
  return withCtx(async (ctx) => {
    const errors = await getErrors();
    const k = String(key);
    if (!k.startsWith(projectBrandPrefix(ctx.workspace.id, String(projectId))) || k.includes("..")) throw new HttpError(400, errors.badBody);
    const got = await inspectBrandFile(k, String(type), name ? String(name) : undefined);
    if (got === "missing") throw new HttpError(400, errors.missingFile);
    if (got === "type") throw new HttpError(415, errors.brandFileType);
    if (got === "unsafe") throw new HttpError(415, errors.brandSvgUnsafe);
    return got;
  });
}
