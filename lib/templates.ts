// Templates: a whole system to start a project from. A template is a project the library keeps apart (it has
// `template` set): its eight areas with their decision, why and never list, its paragraph, and the recipe of
// the work it came from (how a client's site became its redesign, round by round). Using one starts a new
// project with that system as decided as the template has it, its board, and the recipe beside it.
import "server-only";
import { and, asc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { HttpError, newId } from "./workspace-core";
import { getErrors } from "./i18n";
import { boardStamp, copySystem, getSystem } from "./system";
import { saveBrief } from "./polish";
import { ensureBuiltinTemplates } from "./template-seed";
import type { Project } from "@/types/inspo";
import { RECIPE_MAX, type ProjectTemplate, type TemplateCard } from "@/types/system";

const P = schema.project;
type Author = { id: string; name: string };

const cleanUrl = (u: unknown) => { const s = String(u ?? "").trim().slice(0, 300); return /^https?:\/\//i.test(s) ? s : s ? `https://${s}` : ""; };
const cleanTemplate = (t: Partial<ProjectTemplate>): ProjectTemplate => ({ from: cleanUrl(t.from), to: cleanUrl(t.to), about: String(t.about ?? "").trim().slice(0, 400), ...(t.video ? { video: cleanUrl(t.video) } : {}), ...(t.builtin ? { builtin: String(t.builtin) } : {}) });
const NAME_MAX = 60;
const cleanName = async (name: unknown) => { const n = String(name ?? "").trim().replace(/\s+/g, " ").slice(0, NAME_MAX); if (!n) throw new HttpError(400, (await getErrors()).badBody); return n; };

/** A clone never takes the name of a project the workspace already has: it gets the first free "Name (1)", "Name (2)"… */
async function freeName(organizationId: string, name: string): Promise<string> {
  const rows = await db.select({ name: P.name }).from(P).where(and(eq(P.organizationId, organizationId), isNull(P.template)));
  const taken = new Set(rows.map((r) => r.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  const base = name.replace(/ \(\d+\)$/, "");
  for (let i = 1; ; i++) {
    const tail = ` (${i})`;
    const next = base.slice(0, NAME_MAX - tail.length).trimEnd() + tail;
    if (!taken.has(next.toLowerCase())) return next;
  }
}

export async function listTemplates(organizationId: string): Promise<TemplateCard[]> {
  // The built-in ones (docs/templates) are every workspace's: loaded here the first time, a few seconds once
  await ensureBuiltinTemplates(organizationId);
  const rows = await db.select({ id: P.id, name: P.name, template: P.template, recipe: P.recipe, createdAt: P.createdAt }).from(P)
    // In the order they came: the first template stays first, a new one goes after the ones already there
    .where(and(eq(P.organizationId, organizationId), isNotNull(P.template))).orderBy(asc(P.createdAt));
  return Promise.all(rows.map(async (r) => ({
    id: r.id, name: r.name, template: cleanTemplate((r.template ?? {}) as Partial<ProjectTemplate>),
    system: await getSystem(organizationId, r.id), recipeSize: r.recipe.length, createdAt: r.createdAt.toISOString(),
  })));
}

/** A new project from a template: its system as the template decided it, its recipe, and the sentence it is about */
export async function useTemplate(organizationId: string, templateId: string, name: string, author: Author): Promise<Project & { boardIds: string[] }> {
  const [tpl] = await db.select({ id: P.id, template: P.template, recipe: P.recipe }).from(P)
    .where(and(eq(P.organizationId, organizationId), eq(P.id, templateId), isNotNull(P.template))).limit(1);
  if (!tpl) throw new HttpError(404, (await getErrors()).projectNotFound);
  const now = new Date();
  const id = newId();
  const n = await freeName(organizationId, await cleanName(name));
  // It comes with a system, but it opens on its board like any project still gathering: the references it starts
  // from are seen first, and the step to the system ("I have my references") is the team's to take
  await db.insert(P).values({ id, organizationId, name: n, createdBy: author.id, recipe: tpl.recipe, createdAt: now, updatedAt: now });
  // The template's decisions are finished work: they come as the team's (a whole template starts at 100%), not
  // as proposals the next run may rewrite
  await copySystem(organizationId, templateId, id, "team", author);
  const boardIds = await copyBoard(organizationId, templateId, id, author.id);
  // A whole system has already read its board: the clone starts as read, so opening it does not run the model
  // over it. One with open areas is left for the first run to fill from the board.
  if (boardIds.length && (await getSystem(organizationId, id)).areas.every((a) => a.decision)) {
    const read = await boardStamp(organizationId, id);
    await db.update(schema.projectSystem).set({ runJson: { itemIds: read.itemIds, stamp: read.stamp, model: "template", at: now.toISOString() } })
      .where(and(eq(schema.projectSystem.organizationId, organizationId), eq(schema.projectSystem.projectId, id)));
  }
  const about = cleanTemplate((tpl.template ?? {}) as Partial<ProjectTemplate>).about;
  if (about) await saveBrief(organizationId, id, { about }, author.id);
  // The references it starts with go back too: the page files them in the new project without loading everything again
  return { id, name: n, intent: about || null, hasRecipe: tpl.recipe.length > 0, started: false, boardIds };
}

/** The template's board goes with the clone: the same references filed in the new project, and under the same
 *  areas with what to take from each, so it starts with something to look at and not with an empty board */
async function copyBoard(organizationId: string, templateId: string, projectId: string, userId: string): Promise<string[]> {
  const PI = schema.projectItem, A = schema.systemArea;
  const rows = await db.select({ itemId: PI.itemId }).from(PI)
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, templateId), isNull(PI.archivedAt)));
  if (!rows.length) return [];
  const now = new Date();
  await db.insert(PI).values(rows.map((r) => ({ projectId, itemId: r.itemId, organizationId, addedBy: userId, createdAt: now }))).onConflictDoNothing();
  const from = await getSystem(organizationId, templateId);
  for (const a of from.areas) {
    if (!a.evidence.length) continue;
    // copySystem wrote the area when it had a decision or a never; an area with only references is written here
    await db.insert(A).values({ projectId, organizationId, area: a.area, decision: "", confidence: 0, evidence: a.evidence, source: null, decidedBy: null, why: "", never: "", curationJson: null, updatedAt: now })
      .onConflictDoUpdate({ target: [A.projectId, A.area], set: { evidence: a.evidence, updatedAt: now } });
  }
  return rows.map((r) => r.itemId);
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

/** A template stops being one: deleted, with its system (cascade). Not a built-in one: it would come back by itself */
export async function deleteTemplate(organizationId: string, templateId: string): Promise<void> {
  await db.delete(P).where(and(eq(P.organizationId, organizationId), eq(P.id, templateId), isNotNull(P.template), sql`${P.template}->>'builtin' is null`));
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
