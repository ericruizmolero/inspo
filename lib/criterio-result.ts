// The Result view: a page an AI builds from the project's criterio.md, inside the app. The first proof of the file:
// what the team would get pasting it into Claude, without leaving. It is built from the file as a share link hands
// it out, which is kept as a version (via "result"), so every result says which version of the file it shows.
//
// What it costs: one call to a frontier model (~$0.10 a page), one of the plan's AI actions; the account's first one is
// free, like its first system pass. The one the view builds on its own, a project's very first, never counts: nobody
// asked for it (AUTO_REF), and only a project with no result yet can have it. The page is one self-contained HTML file, shown in a sandboxed frame with no scripts.
import "server-only";
import { and, desc, eq, isNull, notLike, or, sql } from "drizzle-orm";
import { db, schema } from "./db";
import { newId } from "./workspace-core";
import { llm } from "./llm";
import { prompt } from "./prompts";
import { loadShareView } from "./share-view";
import { recordVersion } from "./criterio-versions";
import { billOf, recordUsage, type UsageCtx } from "./usage";
import { AUTO_REF, FIRST_REF } from "./usage-core";
import { PAGE_KINDS, isPage } from "./composition-core";
import type { OutputLanguage } from "./output-language";
import type { Locale } from "./i18n/locale";
import type { InspoTags } from "@/types/inspo";
import { log } from "./log";

const R = schema.criterioResult;

/** The kinds of page a result can be: whole pages, as the composition reads them */
export const RESULT_PAGES = PAGE_KINDS.map((p) => p.key).filter((k) => !["fragment", "not-a-page", "docs", "app-screen"].includes(k));

export interface CriterioResultRow {
  id: string;
  page: string;
  versionN: number | null;
  status: "running" | "done" | "failed";
  html: string;
  byName: string | null;
  at: string;
}

export const RESULT_SYSTEM = `You are a senior web designer and front-end developer. You build ONE page of a project's website from its criterio.md: the design system the team decided, with the references behind it.

FOLLOW THE FILE
- "How to use this file" says what binds and what guides: the brand's values (hex codes, typefaces, the type scale, the tokens) and every Never line are required, exactly as written. Each area's decision is the direction. The references are inspiration, never something to copy.
- Layout: when the file says a structure repeats, the page is built on that structure (its columns, what stays put, where the navigation sits). "By page" lists the references of the kind of page asked for: start from them.
- An area left open: choose the plainest option that fits the decided ones. Never add a style nobody decided.

THE PAGE
- One self-contained HTML file: <!doctype html>, a <style> in the head, no scripts, no external files except Google Fonts for the families the file names (any other family: the closest Google Font, then a generic one).
- Pictures are neutral blocks in the page's own tones, sized as the layout needs, each with a short caption of what goes there, as the imagery area describes it. Never an <img> to an outside address.
- The copy is real for this project, written from its brief and its voice: never lorem ipsum, never placeholder brackets. Keep it short and plausible; invent no figures, clients or awards.
- Responsive: it reads on a phone too.
- Answer with the HTML only.`;

/** The account's results so far, to know whether this one is its first (free) */
async function hadResult(organizationId: string): Promise<boolean> {
  const U = schema.aiUsage, O = schema.organization;
  const [r] = await db.select({ one: sql<number>`1` }).from(U)
    .where(and(sql`${U.billingAccountId} = (select ${O.billingAccountId} from ${O} where ${O.id} = ${organizationId})`, eq(U.action, "result"), or(isNull(U.ref), notLike(U.ref, `${AUTO_REF}%`))))
    .limit(1);
  return !!r;
}

/** The HTML out of the answer: a fenced block or the document itself */
export function htmlOf(text: string): string {
  const fenced = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.search(/<!doctype html|<html/i);
  return start > 0 ? body.slice(start) : body;
}

/** The kind of page the board shows most, to build first; the home when none reads as one */
export async function suggestedPage(organizationId: string, projectId: string): Promise<string> {
  const T = schema.inspoItem, PI = schema.projectItem;
  const rows = await db.select({ tags: T.tagsJson }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId)));
  const by = new Map<string, number>();
  for (const r of rows) {
    const c = (r.tags as InspoTags | null)?.composition;
    if (isPage(c) && RESULT_PAGES.includes(c.page)) by.set(c.page, (by.get(c.page) ?? 0) + 1);
  }
  return [...by].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "home";
}

/** Whether the project has had any result, finished or not: the automatic one is only for a project with none */
export async function hasResult(organizationId: string, projectId: string): Promise<boolean> {
  const [r] = await db.select({ id: R.id }).from(R).where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId))).limit(1);
  return !!r;
}

/** The project's results, newest first, at most `limit` */
export async function listResults(organizationId: string, projectId: string, limit = 12): Promise<CriterioResultRow[]> {
  const rows = await db.select().from(R).where(and(eq(R.organizationId, organizationId), eq(R.projectId, projectId))).orderBy(desc(R.createdAt)).limit(limit);
  const cutOff = Date.now() - RESULT_STALE_MS;
  return rows.map((r) => ({
    id: r.id, page: r.page, versionN: r.versionN, html: r.html, byName: r.byName, at: r.createdAt.toISOString(),
    status: r.status === "running" && r.createdAt.getTime() < cutOff ? "failed" : r.status as CriterioResultRow["status"],
  }));
}

/**
 * Builds one page from the project's criterio.md as it is now. Awaited: the person is watching it come (40 to 60 s).
 * A result left "running" by a cut-off function reads as failed after a few minutes (listResults).
 */
export async function buildResult(input: {
  organizationId: string; projectId: string; page: string; usage: UsageCtx; byName: string;
  locale: Locale; language: OutputLanguage; origin: string;
  /** Built by the view on its own: the caller checked the project had no result (hasResult) */
  auto?: boolean;
}): Promise<CriterioResultRow> {
  const page = RESULT_PAGES.includes(input.page) ? input.page : "home";
  const id = newId();
  const now = new Date();
  await db.insert(R).values({ id, organizationId: input.organizationId, projectId: input.projectId, page, status: "running", byName: input.byName, createdAt: now });
  try {
    const view = await loadShareView(input.organizationId, input.projectId, "full", input.locale, null, input.origin);
    if (!view) throw new Error("project not found");
    const versionN = await recordVersion({ organizationId: input.organizationId, projectId: input.projectId, via: "result", byName: input.byName, locale: input.locale, origin: input.origin, view });
    const kind = PAGE_KINDS.find((p) => p.key === page)!;
    const free = !input.auto && !(await hadResult(input.organizationId));
    const res = await llm(prompt("result", {
      system: RESULT_SYSTEM,
      text: `Build the ${page} page (${kind.description.toLowerCase()}) of this project, following its criterio.md.\n\n${view.markdown}`,
      language: input.language,
    }));
    await recordUsage(input.usage, { action: "result", ...billOf(res), ref: `${input.auto ? AUTO_REF : free ? FIRST_REF : ""}project:${input.projectId}` });
    const html = htmlOf(res.text);
    if (!/<html|<body|<main|<section/i.test(html)) throw new Error("the answer is not a page");
    await db.update(R).set({ status: "done", html, model: res.model, versionN }).where(eq(R.id, id));
    log.info("result.built", { ref: input.projectId, page, versionN, costUsd: res.costUsd, ms: res.ms });
    return { id, page, versionN, status: "done", html, byName: input.byName, at: now.toISOString() };
  } catch (err) {
    await db.update(R).set({ status: "failed" }).where(eq(R.id, id));
    log.error("result.failed", { ref: input.projectId, err });
    throw err;
  }
}

/** A result still "running" this long after it started was cut off: it reads as failed */
const RESULT_STALE_MS = 5 * 60_000;
