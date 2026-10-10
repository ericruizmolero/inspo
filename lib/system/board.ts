import "server-only";
import { createHash } from "crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "../db";
import { PROMPTS } from "../prompts";
import { summarize } from "../jev";
import { SIGNAL_AREA, TAXONOMY_VERSION } from "../taxonomy";
import type { InspoColor, InspoTags } from "@/types/inspo";
import { rowToItem } from "../items";
import { mediaKindOf } from "../url";
import { getDesignMd, designDocsFor } from "../design-store";
import { refMeasuredOf } from "../ref-measured";
import { getWhy } from "../design-why";
import { BRIEF_KEYS, type DesignBrief, type DesignSpec, type DesignWhy } from "@/types/design";
import { SYSTEM_AREAS, type ProjectSystem, type SystemArea, type SystemEvidence, type AreaSupport } from "@/types/system";
import type { Brief } from "@/types/brief";
import { projectGuides, type GuideCut } from "../brand-guides";
import { areaMemory, type AreaMemory } from "../area-comments";
import { getSystem, projectRow } from "./areas";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;
const C = schema.inspoComment;
const A = schema.systemArea;

/** References read per run; beyond this the board is cut, not refused */
const MAX_BOARD = 120;
/** Thread comments sent per reference: the latest ones, each cut to 300 characters */
const COMMENTS_PER_REF = 6;

// ─── The board, as the model reads it ────────────────────────────────────────

/** What a reference measured, as the system pass reads it: the DESIGN.md's glance and real values, and the share of each
 *  colour in its saved palette (which images and posts have too). Undefined when nothing was measured */
export function measuredSummary(spec: DesignSpec | null, pixels: InspoColor[] | undefined): Record<string, unknown> | undefined {
  const b = spec?.brief;
  const glance = b ? Object.fromEntries(BRIEF_KEYS.filter((k) => k !== "framework" && b[k]).map((k) => [k, b[k]])) as Partial<DesignBrief> : {};
  const m = refMeasuredOf(spec, pixels);
  const out: Record<string, unknown> = {
    glance: Object.keys(glance).length ? glance : undefined,
    layout: spec?.layout || undefined,
    colors: m?.colors, pixels: m?.pixels, families: m?.families, radius: m?.radius, density: m?.density, theme: m?.theme,
  };
  const kept = Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined));
  return Object.keys(kept).length ? kept : undefined;
}

interface BoardRef {
  code: string;
  itemId: string;
  words: string[];
  ref: Record<string, unknown>;
  /** The tagger's signals on it, by area (v5 tags); empty before */
  signals: Partial<Record<SystemArea, string[]>>;
}

/** How many references of the board show each signal, by area, most shown first: what a decision's confidence
 *  and its support are counted from. `refs` are board codes, so a frozen snapshot carries it too */
export interface SignalTally {
  of: number;
  areas: Partial<Record<SystemArea, { signal: string; refs: string[] }[]>>;
}

export function signalTally(refs: Pick<BoardRef, "code" | "signals">[]): SignalTally {
  const areas: SignalTally["areas"] = {};
  for (const area of SYSTEM_AREAS) {
    const by = new Map<string, string[]>();
    for (const r of refs) for (const k of r.signals[area] ?? []) by.set(k, [...(by.get(k) ?? []), r.code]);
    if (by.size) areas[area] = [...by].map(([signal, codes]) => ({ signal, refs: codes })).sort((a, b) => b.refs.length - a.refs.length);
  }
  return { of: refs.length, areas };
}

/** A reference's v5 tags as the system reads them: per area its signal keys, and what was measured (measuredSummary),
 *  plus the families its CSS names when no sheet measured any. They stand in for the prose look and the facet lists */
export function signalsOf(t: InspoTags, spec: DesignSpec | null): { signals?: Record<string, string>; measured?: Record<string, unknown> } {
  const areas = Object.entries(t.areas ?? {}) as [SystemArea, { signals: string[] }][];
  const sheet = measuredSummary(spec, t.colors);
  const css = !sheet?.families && t.fonts?.length ? { css_families: t.fonts.slice(0, 4) } : null;
  return {
    signals: areas.length ? Object.fromEntries(areas.map(([area, a]) => [area, a.signals.join(", ")])) : undefined,
    measured: sheet || css ? { ...sheet, ...css } : undefined,
  };
}

/** The board cut to MAX_BOARD: what the team filed under an area and the client's site first, then what the team wrote
 *  about (a note, a comment, a highlight), then the newest. What is kept stays in board order */
async function cutBoard<R extends { row: typeof T.$inferSelect; at: Date }>(organizationId: string, projectId: string, all: R[], commented: Set<string>): Promise<R[]> {
  const W = schema.designWhy;
  const webs = [...new Set(all.map(({ row }) => row.web))];
  const [[project], areas, whys] = await Promise.all([
    db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1),
    db.select({ evidence: A.evidence }).from(A).where(and(eq(A.organizationId, organizationId), eq(A.projectId, projectId))),
    db.select({ url: W.url, why: W.whyJson }).from(W).where(and(eq(W.organizationId, organizationId), inArray(W.url, webs))),
  ]);
  const first = new Set([project?.brief?.clientItemId, ...areas.flatMap((a) => (Array.isArray(a.evidence) ? (a.evidence as SystemEvidence[]) : []).filter((e) => e.pinned).map((e) => e.itemId))]);
  const pointed = new Set(whys.filter((w) => (w.why as DesignWhy | null)?.highlights?.length).map((w) => w.url));
  const rank = ({ row }: R) => first.has(row.id) ? 0 : row.note.trim() || row.subNote?.trim() || commented.has(row.id) || pointed.has(row.web) ? 1 : 2;
  const keep = new Set([...all].sort((a, b) => rank(a) - rank(b) || b.at.getTime() - a.at.getTime()).slice(0, MAX_BOARD).map(({ row }) => row.id));
  return all.filter(({ row }) => keep.has(row.id));
}

/**
 * Everything known about each reference, the team's words first. The stamp fingerprints the words,
 * so a new note or comment reads as a stale run even when no reference was added. A reference's code is its place
 * on the whole board (as lib/brand.ts names it), so the cut never renumbers one.
 */
export async function loadBoard(organizationId: string, projectId: string): Promise<{ refs: BoardRef[]; stamp: string; omitted: number }> {
  const rows = await db.select({ row: T, at: PI.createdAt }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  const all = rows.map((r, i) => ({ ...r, code: `r${i + 1}` }));
  const threads = all.length
    ? await db.select({ itemId: C.itemId, author: C.authorName, body: C.body, attachments: C.attachments }).from(C)
        .where(and(eq(C.organizationId, organizationId), inArray(C.itemId, all.map(({ row }) => row.id)))).orderBy(C.createdAt)
    : [];
  const byItem = new Map<string, string[]>();
  // The model reads no pictures here: a comment made with a screenshot says so, so its words ("these 3D…") are
  // read as pointing at something on the reference and not as a line on their own
  for (const c of threads) byItem.set(c.itemId, [...(byItem.get(c.itemId) ?? []), `${c.author}: ${c.body.trim().slice(0, 300)}${c.attachments?.length ? " (said with a screenshot attached, pointing at that part of the reference)" : ""}`]);
  const board = all.length > MAX_BOARD ? await cutBoard(organizationId, projectId, all, new Set(byItem.keys())) : all;
  const ids = board.map(({ row }) => row.id);

  // DESIGN.md sheets and "why it's here", only the ones that exist; never generated here
  const docs = await designDocsFor(board.map(({ row }) => row.web));
  const sheets = await Promise.all(board.map(async ({ row }) => {
    if (mediaKindOf(row.web) !== "web" || !(row.web in docs)) return { spec: null, why: null };
    const [entry, why] = await Promise.all([getDesignMd(row.web), getWhy(organizationId, row.web)]);
    return { spec: entry?.spec ?? null, why: (why?.why as DesignWhy | undefined) ?? null };
  }));

  const refs: BoardRef[] = board.map(({ row, code }, i) => {
    const item = rowToItem(row);
    const said = byItem.get(row.id) ?? [];
    const comments = said.slice(-COMMENTS_PER_REF);
    const omitted = said.length - comments.length || undefined;
    const { spec, why } = sheets[i];
    const pointed = why?.highlights?.map((h) => ({ quote: h.quote, by: h.author, values: h.values?.length ? h.values : undefined, take: h.note || undefined })) ?? [];
    const base = summarize(item, row.tagsJson ?? undefined);
    const tags = row.tagsJson && row.tagsJson.v >= TAXONOMY_VERSION ? row.tagsJson : null;
    const v5 = tags ? signalsOf(tags, spec) : null;
    return {
      code,
      itemId: row.id,
      signals: Object.fromEntries(Object.entries(tags?.areas ?? {}).map(([area, a]) => [area, a!.signals])),
      words: [base.curator_notes ?? "", ...comments, ...pointed.map((p) => p.quote)],
      // A pasted text is the project's content: the model gets its title and first lines, nothing to read a look from
      ref: mediaKindOf(row.web) === "text" ? {
        id: code, kind: "text", name: base.name, curator_notes: base.curator_notes, excerpt: base.page,
        team_comments: comments.length ? comments : undefined, team_comments_omitted: omitted,
      } : v5 ? {
        id: code, kind: mediaKindOf(row.web), name: base.name, url: base.url, curator_notes: base.curator_notes, page: base.page,
        sector: base.sector, style: base.style,
        team_comments: comments.length ? comments : undefined, team_comments_omitted: omitted,
        team_pointed_at: pointed.length ? pointed : undefined,
        signals: v5.signals,
        measured: v5.measured,
      } : {
        id: code, kind: mediaKindOf(row.web), ...base,
        team_comments: comments.length ? comments : undefined, team_comments_omitted: omitted,
        team_pointed_at: pointed.length ? pointed : undefined,
        measured: measuredSummary(spec, row.tagsJson?.colors),
      },
    };
  });
  const stamp = createHash("sha1").update(JSON.stringify({ ids, w: refs.map((r) => r.words), m: PROMPTS.system.model, v: PROMPTS.system.version })).digest("hex").slice(0, 20);
  return { refs, stamp, omitted: all.length - board.length };
}

/** The current board's stamp, so the client can tell a stale run without running */
export async function boardStamp(organizationId: string, projectId: string): Promise<{ stamp: string; itemIds: string[] }> {
  const { refs, stamp } = await loadBoard(organizationId, projectId);
  return { stamp, itemIds: refs.map((r) => r.itemId) };
}

/** The board as the model reads it, with the client's current site marked when the project is a redesign */
export function markClient(refs: BoardRef[], brief: Partial<Brief> | null | undefined) {
  const id = brief?.clientItemId;
  return refs.map((r) => (id && r.itemId === id ? { ...r.ref, client_site: true } : r.ref));
}

/** Everything the system pass reads: built from the database by runSystem, frozen as a fixture by the eval (scripts/eval-system.ts) */
export interface SystemSnapshot {
  name: string;
  brief: Partial<Brief> | null;
  /** The system as it stands, its references named by their code on the board */
  standing: ({ area: SystemArea; status: string; decision?: string; confidence?: number; evidence?: { ref: string; take?: string; filed_by_team?: boolean }[]; never?: string[] } & AreaMemory)[];
  /** The board as the model reads it, the client's site marked */
  refs: Record<string, unknown>[];
  /** References on the board left out of this reading (MAX_BOARD) */
  omitted: number;
  guides: string[];
  /** What the guides lost to READ_MAX; absent when nothing */
  guidesCut?: GuideCut;
  /** The board's signals counted (signalTally); missing on a board frozen before v5 tags */
  signals?: SignalTally;
}

/** The system pass's input as the database has it now */
export async function loadSnapshot(organizationId: string, projectId: string): Promise<{ snapshot: SystemSnapshot; refs: BoardRef[]; stamp: string; current: ProjectSystem }> {
  const project = await projectRow(organizationId, projectId);
  const [{ refs, stamp, omitted }, current, guides, memory] = await Promise.all([loadBoard(organizationId, projectId), getSystem(organizationId, projectId), projectGuides(organizationId, projectId), areaMemory(organizationId, projectId)]);
  const codeOf = new Map(refs.map((r) => [r.itemId, r.code]));
  const snapshot: SystemSnapshot = {
    name: project.name,
    brief: project.brief,
    standing: current.areas.map((a) => ({
      area: a.area,
      status: a.source ?? "empty",
      decision: a.decision || undefined,
      confidence: a.decision ? a.confidence : undefined,
      evidence: a.evidence.length ? a.evidence.map((e) => ({ ref: codeOf.get(e.itemId) ?? "gone", take: e.take || undefined, filed_by_team: e.pinned || undefined })) : undefined,
      never: a.never ? a.never.split("\n") : undefined,
      ...memory[a.area],
    })),
    refs: markClient(refs, project.brief),
    omitted,
    guides: guides.texts,
    ...(guides.cut ? { guidesCut: guides.cut } : {}),
    signals: signalTally(refs),
  };
  return { snapshot, refs, stamp, current };
}

/** The signals a run named for an area, as stored: only that area's keys the board shows, each with its references */
export function supportOf(area: SystemArea, named: string[], tally: SignalTally | undefined, idOf: Map<string, string>): AreaSupport[] {
  const counted = tally?.areas[area] ?? [];
  return [...new Set(named)].filter((k) => SIGNAL_AREA[k] === area).slice(0, 2).flatMap((signal) => {
    const itemIds = (counted.find((x) => x.signal === signal)?.refs ?? []).map((c) => idOf.get(c)).filter((id): id is string => !!id);
    return itemIds.length ? [{ signal, itemIds, of: tally!.of }] : [];
  });
}

// ─── Visual material behind the system ──────────────────────────────────────────────────────────
// The sheet of each reference holds what the screen can show instead of describing: palettes, families,
// radii, the easing, the page captures. Read once per open, never generated here.

export interface RefVisual {
  itemId: string;
  name: string;
  web: string;
  cover: string | null;
  scroll: string | null;
  colors: { name: string; hex: string; group: "brand" | "accent" | "neutral" | "semantic" }[];
  fonts: { family: string; role: "display" | "body" | "mono" | "ui"; weights: number[] }[];
  radii: { element: string; value: string }[];
  /** The dominant easing as `cubic-bezier(a, b, c, d)` or a CSS keyword, and its duration in ms, when the sheet has them */
  easing: string | null;
  durationMs: number | null;
  logo: string | null;
  icons: string[];
  voice: string | null;
  tagline: string | null;
}

const EASING_RE = /cubic-bezier\(\s*[\d.]+\s*,\s*-?[\d.]+\s*,\s*[\d.]+\s*,\s*-?[\d.]+\s*\)|\b(ease-in-out|ease-out|ease-in|linear|ease)\b/;
const DURATION_RE = /(\d+(?:[.,]\d+)?)\s*(ms|s)\b/;

export async function boardVisuals(organizationId: string, projectId: string): Promise<RefVisual[]> {
  const rows = await db.select({ row: T }).from(PI).innerJoin(T, eq(T.id, PI.itemId))
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  const docs = await designDocsFor(rows.map(({ row }) => row.web));
  return Promise.all(rows.slice(0, MAX_BOARD).map(async ({ row }) => {
    const base: RefVisual = { itemId: row.id, name: row.name, web: row.web, cover: null, scroll: null, colors: [], fonts: [], radii: [], easing: null, durationMs: null, logo: null, icons: [], voice: null, tagline: null };
    if (mediaKindOf(row.web) !== "web" || !(row.web in docs)) return base;
    const e = await getDesignMd(row.web);
    if (!e) return base;
    const s = e.spec;
    const motion = `${s?.brief?.motion ?? ""} ${s?.motion ?? ""}`;
    const easing = motion.match(EASING_RE)?.[0] ?? null;
    const dur = motion.match(DURATION_RE);
    const durationMs = dur ? Math.round(parseFloat(dur[1].replace(",", ".")) * (dur[2] === "s" ? 1000 : 1)) : null;
    return {
      ...base,
      cover: e.coverUrl ?? e.screenshotUrl ?? null,
      scroll: e.scrollUrl ?? null,
      colors: (s?.colors ?? []).map((c) => ({ name: c.name, hex: c.hex, group: c.group })),
      fonts: (s?.fonts ?? []).map((f) => ({ family: f.family, role: f.role, weights: f.weights })),
      radii: s?.radii ?? [],
      easing, durationMs,
      logo: e.logoUrl ?? null,
      icons: (e.icons ?? []).slice(0, 8),
      voice: s?.brief?.voice ?? null,
      tagline: s?.tagline ?? null,
    };
  }));
}
