// Templates: a whole system to start a project from. A template is a project the library keeps apart (it has
// `template` set): its eight areas with their decision, why and never list, its paragraph, and the recipe of
// the work it came from (how a client's site became its redesign, round by round). Using one starts a new
// project with that system as proposals for the team to confirm, and the recipe beside it.
import "server-only";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import { copySystem, getSystem } from "./system";
import { saveBrief } from "./polish";
import type { Project } from "@/types/inspo";
import { RECIPE_MAX, type ProjectTemplate, type TemplateCard } from "@/types/system";

const P = schema.project;
type Author = { id: string; name: string };

const cleanUrl = (u: unknown) => { const s = String(u ?? "").trim().slice(0, 300); return /^https?:\/\//i.test(s) ? s : s ? `https://${s}` : ""; };
const cleanTemplate = (t: Partial<ProjectTemplate>): ProjectTemplate => ({ from: cleanUrl(t.from), to: cleanUrl(t.to), about: String(t.about ?? "").trim().slice(0, 400) });
const cleanName = async (name: unknown) => { const n = String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 60); if (!n) throw new HttpError(400, (await getErrors()).badBody); return n; };

export async function listTemplates(organizationId: string): Promise<TemplateCard[]> {
  const rows = await db.select({ id: P.id, name: P.name, template: P.template, recipe: P.recipe, createdAt: P.createdAt }).from(P)
    .where(and(eq(P.organizationId, organizationId), isNotNull(P.template))).orderBy(desc(P.createdAt));
  return Promise.all(rows.map(async (r) => ({
    id: r.id, name: r.name, template: cleanTemplate((r.template ?? {}) as Partial<ProjectTemplate>),
    system: await getSystem(organizationId, r.id), recipeSize: r.recipe.length, createdAt: r.createdAt.toISOString(),
  })));
}

/** A project's system, kept as a template: a copy (the project goes on), with where it started and where it ended */
export async function saveAsTemplate(organizationId: string, projectId: string, input: { name: string } & Partial<ProjectTemplate>, author: Author): Promise<TemplateCard> {
  const [src] = await db.select({ id: P.id, recipe: P.recipe }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!src) throw new HttpError(404, (await getErrors()).projectNotFound);
  const now = new Date();
  const id = newId();
  await db.insert(P).values({ id, organizationId, name: await cleanName(input.name), createdBy: author.id, template: cleanTemplate(input), recipe: src.recipe, createdAt: now, updatedAt: now });
  await copySystem(organizationId, projectId, id, "team", author);
  return (await listTemplates(organizationId)).find((t) => t.id === id)!;
}

/** A new project from a template: its system as proposals, its recipe, and the sentence it is about */
export async function useTemplate(organizationId: string, templateId: string, name: string, author: Author): Promise<Project> {
  const [tpl] = await db.select({ id: P.id, template: P.template, recipe: P.recipe }).from(P)
    .where(and(eq(P.organizationId, organizationId), eq(P.id, templateId), isNotNull(P.template))).limit(1);
  if (!tpl) throw new HttpError(404, (await getErrors()).projectNotFound);
  const now = new Date();
  const id = newId();
  const n = await cleanName(name);
  await db.insert(P).values({ id, organizationId, name: n, createdBy: author.id, recipe: tpl.recipe, createdAt: now, updatedAt: now });
  await copySystem(organizationId, templateId, id, "model", author);
  const about = cleanTemplate((tpl.template ?? {}) as Partial<ProjectTemplate>).about;
  if (about) await saveBrief(organizationId, id, { about }, author.id);
  return { id, name: n, intent: about || null, hasRecipe: tpl.recipe.length > 0 };
}

export async function getRecipe(organizationId: string, projectId: string): Promise<string> {
  const [r] = await db.select({ recipe: P.recipe }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!r) throw new HttpError(404, (await getErrors()).projectNotFound);
  return r.recipe;
}

export async function setRecipe(organizationId: string, projectId: string, recipe: string): Promise<void> {
  const text = String(recipe ?? "").replace(/\r\n/g, "\n").slice(0, RECIPE_MAX);
  const res = await db.update(P).set({ recipe: text, updatedAt: new Date() }).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId)));
  if (!res.rowCount) throw new HttpError(404, (await getErrors()).projectNotFound);
}

/** A template stops being one: deleted, with its system (cascade) */
export async function deleteTemplate(organizationId: string, templateId: string): Promise<void> {
  await db.delete(P).where(and(eq(P.organizationId, organizationId), eq(P.id, templateId), isNotNull(P.template)));
}

/**
 * The published result of a template as a page: the whole page and its top, captured once with Chromium and
 * kept in the shared page index (lib/page-shots.ts), like any site the library holds. Null without a result.
 */
export async function templatePage(organizationId: string, templateId: string): Promise<{ topUrl: string; shotUrl: string; shotH: number; color?: string } | null> {
  const [row] = await db.select({ template: P.template }).from(P)
    .where(and(eq(P.organizationId, organizationId), eq(P.id, templateId), isNotNull(P.template))).limit(1);
  if (!row) throw new HttpError(404, (await getErrors()).badBody);
  const url = cleanTemplate((row.template ?? {}) as Partial<ProjectTemplate>).to;
  if (!url) return null;
  const { getPageIndex } = await import("./page-shots");
  const { capturePage } = await import("./screenshot");
  const { normalizeWebUrl } = await import("./url");
  const shot = (await getPageIndex())[normalizeWebUrl(url) ?? url] ?? await capturePage(url);
  return { topUrl: shot.topUrl, shotUrl: shot.shotUrl, shotH: shot.shotH, color: shot.color };
}
