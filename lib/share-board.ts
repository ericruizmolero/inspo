// What a share link shows: the project's board, read only, as the team sees it (Eric, 06-11: "el tablón se tiene que
// ver tal y como es con sus dinámicas de zoom y todo tal cual, solo que es modo preview", and "que se comparta solo
// el tablero, el MD no"). Built on the server from the same data the app's board reads; every stored picture goes
// through the link's own file route (/s/<token>/f/<key>), which serves only the files this board names.
import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "./db";
import { loadWorkspaceData } from "./items";
import { designDocsFor } from "./design-store";
import { pageShotsFor } from "./page-shots";
import { readText } from "./text-refs";
import { keyOf } from "./storage";
import { cardCopyOf } from "./board";
import { mediaKindOf, staysInside } from "./url";
import type { ShareMode } from "./share";
import type { DesignIndex, InspoItem, InspoTags, PageShot } from "@/types/inspo";

const P = schema.project;
const PI = schema.projectItem;

export interface ShareBoard {
  name: string;
  /** The board's references, newest on the project first, as the team's board opens. In a clean link no one's name
   *  and no note: `addedBy` and `note` come empty */
  items: InspoItem[];
  /** What each card draws, keyed by address like the app's maps, every file already under the link */
  thumbs: Record<string, string>;
  cards: Record<string, string>;
  shots: Record<string, PageShot>;
  designs: DesignIndex;
  tags: Record<string, InspoTags>;
  /** A pasted text's words, by item id */
  texts: Record<string, string>;
  /** References whose og:image the link may fetch (/s/<token>/og): sites with no stored picture */
  og: string[];
  /** The team's photos by name, for a link that names who saved each one (full): an outside address as it is, a stored
   *  one through the link. Empty in a clean link */
  people: Record<string, string>;
  /** Every stored key the page may load, for the file route */
  keys: Set<string>;
}

export async function loadShareBoard(share: { organizationId: string; projectId: string; mode: ShareMode; itemIds: string[] | null }, base: string): Promise<ShareBoard | null> {
  const { organizationId, projectId, mode } = share;
  const [project] = await db.select({ name: P.name }).from(P).where(and(eq(P.organizationId, organizationId), eq(P.id, projectId))).limit(1);
  if (!project) return null;
  const rows = await db.select({ itemId: PI.itemId, archivedAt: PI.archivedAt }).from(PI)
    .where(and(eq(PI.organizationId, organizationId), eq(PI.projectId, projectId))).orderBy(asc(PI.createdAt));
  // On the board only: what a polish took off it stays with the project but is not on the board
  // A link made with some of the board shows those, in the order they were picked, if they are still on it
  const live = rows.filter((r) => !r.archivedAt).map((r) => r.itemId).reverse();
  const order = share.itemIds ? share.itemIds.filter((id) => live.includes(id)) : live;
  const data = await loadWorkspaceData(organizationId);
  const byId = new Map(data.items.filter((i) => i.id).map((i) => [i.id!, i]));
  const onBoard = order.map((id) => byId.get(id)).filter((i): i is InspoItem => !!i);
  const webs = onBoard.map((i) => i.web);
  const [designIndex, pageShots] = await Promise.all([designDocsFor(webs), pageShotsFor(webs)]);

  const keys = new Set<string>();
  const through = (url: string | null | undefined): string | undefined => {
    if (!url) return undefined;
    const key = keyOf(url);
    if (!key) return url;
    keys.add(key);
    return `${base}/f/${key}`;
  };
  const out: ShareBoard = { name: project.name, items: [], thumbs: {}, cards: {}, shots: {}, designs: {}, tags: {}, texts: {}, og: [], people: {}, keys };
  if (mode === "full") {
    // Eric, 10-11: "la foto de Eric no sale en compartir... que salga". The page sends no referrer, and the photos load
    const M = schema.member, U = schema.user;
    const team = await db.select({ name: U.name, image: U.image }).from(M).innerJoin(U, eq(U.id, M.userId)).where(eq(M.organizationId, organizationId));
    for (const p of team) { const src = p.image && (/^https:\/\//.test(p.image) ? p.image : through(p.image)); if (src) out.people[p.name] = src; }
  }
  for (const i of onBoard) {
    // What came from X or Pinterest is named and linked, never with our copy of it (lib/url.ts staysInside)
    const held = staysInside(i);
    const kind = mediaKindOf(i.web);
    const web = held ? i.source ?? i.web : kind === "image" ? through(i.web) ?? i.web : i.web;
    out.items.push({
      // On a link the note is the person's, never an AI app's (no Claude mark): Eric, 10-11, "eso solo en compartir"
      ...i, web, via: undefined,
      ...(mode === "full" ? {} : { addedBy: "", note: "" }),
    });
    const tags = data.tagMap[i.web];
    if (tags) out.tags[web] = tags;
    if (held) continue;
    const thumb = data.thumbnailMap[i.web];
    if (thumb) {
      out.thumbs[web] = through(thumb)!;
      const card = cardCopyOf(thumb);
      if (card) out.cards[web] = through(card)!;
    }
    const shot = pageShots[i.web];
    if (shot) {
      out.shots[web] = {
        // The whole page too: the reference's sheet shows it (components/PageView.tsx)
        ...shot, shotUrl: through(shot.shotUrl) ?? "", paths: undefined,
        topUrl: through(shot.paths?.topUrl ?? shot.topUrl)!, tileUrl: through(shot.paths?.tileUrl ?? shot.tileUrl)!, thumbUrl: through(shot.paths?.thumbUrl ?? shot.thumbUrl)!,
      };
    }
    const design = designIndex[i.web];
    if (design?.coverUrl || design?.scrollUrl) out.designs[web] = { coverUrl: through(design.coverUrl), scrollUrl: through(design.scrollUrl) };
    if (kind === "image" && !thumb) {
      const card = cardCopyOf(i.web);
      if (card) out.cards[web] = through(card)!;
    }
    if (kind === "web" && !thumb && !shot && !design?.coverUrl) out.og.push(i.id!);
  }
  const texts = await Promise.all(onBoard.filter((i) => mediaKindOf(i.web) === "text").map(async (i) => [i.id!, await readText(i.web)] as const));
  for (const [id, text] of texts) if (text) out.texts[id] = text;
  return out;
}

