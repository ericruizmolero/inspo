// The Result view: a page an AI builds from the project's criterio.md, inside the app. The first proof of the file:
// what the team would get pasting it into Claude, without leaving. It offers what the board references (boardPieces)
// and builds whatever the team asks for in words. It is built from the file as a share link hands
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
import { dictOf } from "./i18n";
import type { CriterioBlock } from "./criterio-md";
import { recordVersion } from "./criterio-versions";
import { billOf, recordUsage, type UsageCtx } from "./usage";
import { AUTO_REF, FIRST_REF } from "./usage-core";
import { PAGE_KINDS, isPage } from "./composition-core";
import { mediaKindOf, postThumbKind } from "./url";
import type { OutputLanguage } from "./output-language";
import type { Locale } from "./i18n/locale";
import type { InspoTags } from "@/types/inspo";
import { log } from "./log";

const R = schema.criterioResult;

/** The kinds of page a result can be: whole pages, as the composition reads them. Besides them, a storyboard
 *  (STORYBOARD) and whatever the team asks for in words (ASK) */
export const RESULT_PAGES = PAGE_KINDS.map((p) => p.key).filter((k) => !["fragment", "not-a-page", "docs", "app-screen"].includes(k));

/** The result of a board of videos: the piece played as an animatic (CSS only, it plays in the sandboxed frame),
 *  then its frames as stills with their notes */
export const STORYBOARD = "storyboard";

export interface CriterioResultRow {
  id: string;
  page: string;
  versionN: number | null;
  status: "running" | "done" | "failed";
  html: string;
  byName: string | null;
  at: string;
}

/** What the person watching sees while the page is built: what is read from the file, with the references each step
 *  hands the model (their ids, which the view draws from the board), then what the model writes */
export type ResultEvent = { kind: "read" | "write"; text: string; refs?: string[] };

type Steps = ReturnType<typeof dictOf>["system"]["result"]["steps"];

/** The file as read before writing: what the project is, each decided area in a line with the references behind it,
 *  the structure that repeats, the references of the page asked for, then the rest of the board the file cites.
 *  Plain lines out of the blocks the file is made of */
function readingOf(blocks: CriterioBlock[], pageLabel: string | null, repeatsLabel: string, steps: Steps, evidenceOf: (area: string) => string[], cited: string[]): ResultEvent[] {
  const out: ResultEvent[] = [];
  const seen = new Set<string>();
  const fresh = (ids: string[]) => { const f = ids.filter((id) => cited.includes(id) && !seen.has(id)); f.forEach((id) => seen.add(id)); return f.length ? f : undefined; };
  const clip = (t: string, n = 110) => { const one = t.replace(/[*_`>]/g, "").replace(/\s+/g, " ").trim(); const first = one.split(/(?<=[.;])\s/)[0]; return first.length > n ? `${first.slice(0, n - 1)}…` : first; };
  if (blocks.some((b) => b.kind === "section" && b.id === "project")) out.push({ kind: "read", text: steps.project });
  for (const b of blocks) {
    if (b.kind !== "area") continue;
    if (b.decision) out.push({ kind: "read", text: steps.area(b.heading, clip(b.decision)), refs: fresh(evidenceOf(b.area)) });
    // The structure the board repeats, as Layout says it
    for (const x of b.support ?? []) if (x.line.startsWith(`- **${repeatsLabel}:**`)) out.push({ kind: "read", text: clip(x.line.slice(2), 140) });
  }
  if (pageLabel) {
    const pages = blocks.find((b): b is Extract<CriterioBlock, { kind: "section" }> => b.kind === "section" && b.id === "pages");
    const n = Number(pages?.lines.find((l) => l.startsWith(`- **${pageLabel} (`))?.match(/\((\d+)\)/)?.[1] ?? 0);
    out.push({ kind: "read", text: n ? steps.refs(pageLabel, n) : steps.noRefs(pageLabel) });
  }
  const rest = fresh(cited);
  if (rest) out.push({ kind: "read", text: steps.board(cited.length), refs: rest });
  return out;
}

/** What the model has written so far, as the steps a person follows: each one said once, in the order it appears */
function writingSteps(html: string, steps: Steps): string[] {
  const out: string[] = [];
  // Only values already written whole: a family that ends in a comma or a semicolon, a hex that ends in one
  const family = [...html.matchAll(/font-family:\s*['"]?([A-Z][^'",;}]+?)['"]?\s*[,;]/gi)].map((m) => m[1].trim()).find((f) => !f.startsWith("var("));
  if (family) out.push(steps.type(family));
  const hex = html.match(/--[\w-]+:\s*(#(?:[0-9a-f]{6}|[0-9a-f]{3}))\s*[;}]/i)?.[1];
  if (hex) out.push(steps.palette(hex));
  if (/<body/i.test(html)) out.push(steps.body);
  if (/<nav/i.test(html)) out.push(steps.nav);
  for (const m of html.matchAll(/<h([12])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = m[2].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    if (text.length > 2) out.push(m[1] === "1" ? steps.headline(text.slice(0, 80)) : steps.section(text.slice(0, 80)));
  }
  if (/<footer/i.test(html)) out.push(steps.footer);
  return out;
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

export const STORYBOARD_SYSTEM = `You are a senior art director and motion designer. The project's board is not a website: it collects videos, posts and pictures. You make the ANIMATIC and the STORYBOARD of the piece its brief describes (a promo video, a launch film, a campaign), as one HTML page, following its criterio.md: the design system the team decided, with the references behind it.

FOLLOW THE FILE
- "How to use this file" says what binds and what guides: the brand's values (hex codes, typefaces, the type scale, the tokens) and every Never line are required, exactly as written. Each area's decision is the direction (motion, imagery, voice above all). The references are inspiration, never something to copy.
- An area left open: choose the plainest option that fits the decided ones. Never add a style nobody decided.

THE STORYBOARD
- Six to ten frames in order, each a 16:9 frame in the piece's own tones and type: what is on screen (the on-screen text set as it would appear, shapes and blocks for pictures, with a short caption of what goes there), its shot, motion or transition, and its time in seconds. The first frame opens the piece, the last closes it (the brand, the call to action). Keep the whole piece between 15 and 45 seconds.
- THE ANIMATIC, at the top: one 16:9 stage, as wide as the page, that PLAYS the piece with CSS only. Each frame is a layer stacked on the stage, shown in turn by @keyframes timed from the seconds of each frame (one shared duration, animation-delay per frame, animation-iteration-count: infinite, so it loops). Inside each frame, animate what the file's motion area decides (entrances, the easing and durations it names; when it names none, short and plain: fades and slides of a few pixels). Text appears as it would in the film. Under the stage, a thin progress bar that fills over the whole duration in step.
- Under the animatic, the storyboard itself: every frame as a still (the layer at its finished state), numbered, with its notes under it.
- @media (prefers-reduced-motion: reduce): the stage shows the first frame still, no animation.
- One self-contained HTML file: <!doctype html>, a <style> in the head, no scripts, no external files except Google Fonts for the families the file names (any other family: the closest Google Font, then a generic one). Never an <img> to an outside address.
- The copy is real for this project, written from its brief and its voice: never lorem ipsum, never placeholder brackets. Invent no figures, clients or awards.
- Responsive: the stage keeps 16:9 and its text scales with it (container query units or clamp), the stills stack on a phone.
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

/** What the board references, most first: the kinds of page its references show, and a storyboard when a third of it
 *  or more is video (a video, a post that carries one). References not read as a page yet count by what they are:
 *  web pages offer the home. Never empty */
export async function boardPieces(organizationId: string, projectId: string): Promise<string[]> {
  const T = schema.inspoItem, PI = schema.projectItem;
  const rows = await db.select({ web: T.web, tags: T.tagsJson, thumb: T.thumbnailUrl }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId)));
  const by = new Map<string, number>();
  let unread = 0, videos = 0;
  const add = (k: string) => by.set(k, (by.get(k) ?? 0) + 1);
  for (const r of rows) {
    const c = (r.tags as InspoTags | null)?.composition;
    const media = mediaKindOf(r.web);
    if (isPage(c) && RESULT_PAGES.includes(c.page)) add(c.page);
    else if (media === "video" || (media === "post" && postThumbKind(r.thumb ?? undefined))) videos++;
    else if (media === "web" && !c) unread++;
  }
  if (unread && !by.has("home")) by.set("home", unread);
  if (videos && videos * 3 >= rows.length) by.set(STORYBOARD, videos);
  const out = [...by].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  return out.length ? out : ["home"];
}

/** A result asked for in the team's own words: "ask:" and what they wrote */
export const ASK = "ask:";
const ASK_MAX = 200;

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
  /** Each thing read from the file and written by the model, as it happens */
  onEvent?: (e: ResultEvent) => void;
}): Promise<CriterioResultRow> {
  const asked = input.page.startsWith(ASK) ? input.page.slice(ASK.length).replace(/\s+/g, " ").trim().slice(0, ASK_MAX) : "";
  const page = asked ? `${ASK}${asked}` : input.page === STORYBOARD || RESULT_PAGES.includes(input.page) ? input.page : "home";
  const storyboard = page === STORYBOARD;
  // The project must be this workspace's before anything is written under its id
  const [own] = await db.select({ id: schema.project.id }).from(schema.project)
    .where(and(eq(schema.project.organizationId, input.organizationId), eq(schema.project.id, input.projectId))).limit(1);
  if (!own) throw new Error("project not found");
  const id = newId();
  const now = new Date();
  await db.insert(R).values({ id, organizationId: input.organizationId, projectId: input.projectId, page, status: "running", byName: input.byName, createdAt: now });
  try {
    const view = await loadShareView(input.organizationId, input.projectId, "full", input.locale, null, input.origin);
    if (!view) throw new Error("project not found");
    const versionN = await recordVersion({ organizationId: input.organizationId, projectId: input.projectId, via: "result", byName: input.byName, locale: input.locale, origin: input.origin, view });
    const kind = PAGE_KINDS.find((p) => p.key === page);
    const free = !input.auto && !(await hadResult(input.organizationId));
    const t = dictOf(input.locale);
    const steps = t.system.result.steps;
    const emit = input.onEvent ?? (() => {});
    const evidenceOf = (area: string) => view.system.areas.find((a) => a.area === area)?.evidence.map((e) => e.itemId) ?? [];
    for (const e of readingOf(view.blocks, storyboard || asked ? null : (t.system.md.composition.kinds as Record<string, string>)[page] ?? page, t.system.md.composition.repeats, steps, evidenceOf, Object.keys(view.refs))) emit(e);
    emit({ kind: "write", text: storyboard ? steps.writingStoryboard : steps.writing });
    const said = new Set<string>();
    const res = await llm({
      ...prompt("result", {
        system: storyboard ? STORYBOARD_SYSTEM : RESULT_SYSTEM,
        text: `${asked ? `Build what the team asks for, in their words: "${asked}". When it is not a web page (a video, a post, a poster, a deck), lay it out as one HTML page that shows it (its frames, the piece at its size); the rules for the page still hold. Build it` : storyboard ? "Make the animatic and the storyboard of the piece this project's brief describes" : `Build the ${page} page (${kind!.description.toLowerCase()}) of this project`}, following its criterio.md.\n\n${view.markdown}`,
        language: input.language,
      }),
      onText: input.onEvent ? (soFar, thinking) => {
        const now = thinking ? [steps.thinking] : writingSteps(soFar, steps);
        for (const text of now) if (!said.has(text)) { said.add(text); emit({ kind: "write", text }); }
      } : undefined,
    });
    emit({ kind: "write", text: steps.done });
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
