// What a share link shows: the project's brand as the presentation draws it, its references' pictures, and
// criterio.md in the link's mode (lib/criterio-md.ts), all built on the server from the same data the app reads. Every
// stored file the page points at goes through the link's own file route (/s/<token>/f/<key>), which serves only
// the files this view names.
import "server-only";
import { and, asc, eq, inArray, or } from "drizzle-orm";
import { db, schema } from "./db";
import { getSystem } from "./system";
import { loadWorkspaceData } from "./items";
import { listComments } from "./comments";
import { designDocsFor, getDesignMd, DESIGN_MD_PREFIX } from "./design-store";
import { clientCopyOf, refMeasuredOf, type ProjectMeasures, type RefMeasured } from "./ref-measured";
import type { DesignIndex, InspoColor } from "@/types/inspo";
import { pageShotsFor, PAGES_PREFIX } from "./page-shots";
import { readText } from "./text-refs";
import { systemActivity } from "./area-comments";
import { keyOf } from "./storage";
import { dictOf, type Locale } from "./i18n";
import { refInfoOf } from "./ref-info";
import { blocksToMd, criterioBlocks, type CriterioBlock, type RefInfo } from "./criterio-md";
import { mediaKindOf, staysInside } from "./url";
import { projectBrandPrefix, brandKeyAllowed, keysIn } from "./brand-files";
import type { ShareMode } from "./share";
import type { SystemArea } from "@/types/system";
import type { BrandRef } from "@/components/brand/context";

const P = schema.project;
const PI = schema.projectItem;
const T = schema.inspoItem;

export interface ShareView {
  name: string;
  system: Awaited<ReturnType<typeof getSystem>>;
  refs: Record<string, BrandRef>;
  markdown: string;
  /** The file in blocks (lib/criterio-md.ts), for a reader that wants one part of it (lib/mcp) */
  blocks: CriterioBlock[];
  /** Every stored key the page may load, for the file route */
  keys: Set<string>;
}

/**
 * Builds the view of a project for a link. `base` is the link's path (/s/<token>): stored files are rewritten under
 * it (or under the app's own files route, when `base` is null: the team's copy). `origin` makes the file's links
 * whole, so a copied criterio.md still opens them.
 */
export async function loadShareView(organizationId: string, projectId: string, mode: ShareMode, locale: Locale, base: string | null, origin: string): Promise<ShareView | null> {
  const at = (key: string) => (base === null ? `/api/files/${key}` : `${base}/f/${key}`);
  const [project] = await db.select({ name: P.name, brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!project) return null;
  const rows = await db.select({ itemId: PI.itemId }).from(PI).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  const boardIds = rows.map((r) => r.itemId);
  const [system, data, comments, activity] = await Promise.all([
    getSystem(organizationId, projectId),
    loadWorkspaceData(organizationId),
    mode === "full" ? listComments(organizationId) : Promise.resolve({} as Awaited<ReturnType<typeof listComments>>),
    mode === "full" ? systemActivity(organizationId, projectId) : Promise.resolve(null),
  ]);
  const onBoard = new Set(boardIds);
  // Evidence can point at a reference that left the board: it is still named in the file
  const cited = new Set(system.areas.flatMap((a) => a.evidence.map((e) => e.itemId)));
  const items = data.items.filter((i) => i.id && (onBoard.has(i.id) || cited.has(i.id)));
  const webs = items.map((i) => i.web);
  const [designIndex, shots] = await Promise.all([designDocsFor(webs), pageShotsFor(webs)]);

  const keys = new Set<string>();
  const through = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const key = keyOf(url);
    if (!key) return url;
    keys.add(key);
    return at(key);
  };
  // What came from X or Pinterest is named and linked, but a link never hands out our copy of it (lib/url.ts
  // staysInside). The team's own copy (no base) reads it through the app's file route, as the board does.
  const held = (i: { web: string; source?: string }) => base !== null && staysInside(i);
  const refs: Record<string, BrandRef> = {};
  for (const i of items) {
    const image = data.thumbnailMap[i.web] ?? designIndex[i.web]?.coverUrl ?? shots[i.web]?.tileUrl ?? (mediaKindOf(i.web) === "image" ? i.web : null);
    const web = held(i) ? i.source ?? i.web : mediaKindOf(i.web) === "image" ? through(i.web) ?? i.web : i.web;
    refs[i.id!] = { id: i.id!, name: i.name, web, image: held(i) ? null : through(image), kind: mediaKindOf(i.web) };
  }
  // The brand's own files
  const brand = system.brand;
  if (brand) {
    // Only the workspace's own files, whatever the stored brand says (saved before this check existed, or by hand)
    for (const key of keysIn(brand)) if (brandKeyAllowed(organizationId, key)) keys.add(key);
  }

  // criterio.md, as this link hands it out
  const t = dictOf(locale);
  const texts = Object.fromEntries(await Promise.all(items.filter((i) => mediaKindOf(i.web) === "text").map(async (i) => [i.id!, await readText(i.web)] as const)));
  const infos: Record<string, RefInfo> = Object.fromEntries(items.map((i) => {
    const info = refInfoOf(i, data.tagMap[i.web], comments[i.id!], t);
    if (mode === "full") for (const w of info.said ?? []) w.images = w.images?.map((u) => through(u) ?? u);
    // An image with no page to cite is cited by its file; one that has a page never needs the file
    const web = mediaKindOf(i.web) === "image" && !i.source ? `${origin}${through(i.web)}` : i.web;
    return [i.id!, { ...info, web, ...(texts[i.id!] ? { text: texts[i.id!]! } : {}) }];
  }));
  const client = project.brief?.clientItemId ? items.find((i) => i.id === project.brief!.clientItemId) : null;
  const { measured, clientCopy } = await measuresOf(items.map((i) => ({ id: i.id!, web: i.web, colors: data.tagMap[i.web]?.colors })), designIndex, client?.id ?? null);
  for (const [id, m] of Object.entries(measured)) infos[id].measured = m;
  const blocks = criterioBlocks({
    project: project.name, system, items: infos, labels: t.system.areas as Record<SystemArea, string>, strings: t.system.md,
    client: client ? { name: client.name, web: client.web } : null, about: project.brief?.about || null, brief: project.brief,
    board: boardIds, talk: activity?.notes ?? {}, origin, skills: (system.doc?.skills ?? "").split(",").filter(Boolean), locale,
    brand, mode, fileHref: (key) => { keys.add(key); return `${origin}${at(key)}`; }, clientCopy,
  });
  return { name: project.name, system, refs, markdown: blocksToMd(blocks), blocks, keys };
}

async function measuresOf(items: { id: string; web: string; colors?: InspoColor[] }[], index: DesignIndex, clientId: string | null): Promise<ProjectMeasures> {
  const sheets = new Map(await Promise.all(items
    .filter((i) => mediaKindOf(i.web) === "web" && i.web in index)
    .map(async (i) => [i.id, await getDesignMd(i.web)] as const)));
  const measured: Record<string, RefMeasured> = {};
  for (const i of items) {
    const m = refMeasuredOf(sheets.get(i.id)?.spec ?? null, i.colors);
    if (m) measured[i.id] = m;
  }
  return { measured, clientCopy: clientId ? clientCopyOf(sheets.get(clientId) ?? null) : [] };
}

/** The same measures for the team's own copy of the file, which the app builds in the browser (components/SystemView.tsx) */
export async function loadProjectMeasures(organizationId: string, projectId: string): Promise<ProjectMeasures | null> {
  const [project] = await db.select({ brief: P.brief }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!project) return null;
  const system = await getSystem(organizationId, projectId);
  const board = db.select({ id: T.id }).from(PI).innerJoin(T, eq(T.id, PI.itemId)).where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId)));
  // Evidence can point at a reference that left the board: the file still names it
  const cited = [...new Set(system.areas.flatMap((a) => a.evidence.map((e) => e.itemId)))];
  const rows = await db.select({ id: T.id, web: T.web, tags: T.tagsJson }).from(T)
    .where(and(eq(T.organizationId, organizationId), cited.length ? or(inArray(T.id, board), inArray(T.id, cited)) : inArray(T.id, board)));
  const index = await designDocsFor(rows.map((r) => r.web));
  return measuresOf(rows.map((r) => ({ id: r.id, web: r.web, colors: r.tags?.colors })), index, project.brief?.clientItemId ?? null);
}

/** Whether a key may be served through a link of this project, beyond the ones its view names */
export const shareMayServe = (organizationId: string, projectId: string, key: string) =>
  key.startsWith(projectBrandPrefix(organizationId, projectId)) || key.startsWith(DESIGN_MD_PREFIX) || key.startsWith(PAGES_PREFIX);
