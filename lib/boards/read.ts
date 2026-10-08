// Reading a board on Are.na, Pinterest or Cosmos: a thin network shell over lib/boards/parse.ts.
// Are.na has a public API. Pinterest and Cosmos do not: these are the endpoints their own web pages
// call, unofficial, and they can change without notice (docs/design-system/desarrollo.md).
import "server-only";
import { safeFetch } from "@/lib/safe-fetch";
import { pinterestBoardOf, type BoardRef, type Platform, type RefOf } from "./match";
import { arenaChannel, arenaPage, BadAnswer, collect, cosmosCluster, cosmosPage, pinterestBoard, pinterestPage, type Page } from "./parse";
import type { Entry, Skipped } from "./entries";

/** A board read: what of it Criterio can save, and what stays out and why */
export type Board = { platform: Platform; url: string; name: string; entries: Entry[]; skipped: Skipped; capped: boolean };

export type BoardFailure = "private" | "not-found" | "unavailable";
export class BoardError extends Error {
  constructor(readonly reason: BoardFailure, detail: string) { super(`${reason}: ${detail}`); }
}

interface Reader<R extends BoardRef> { read(ref: R): Promise<Board> }

/** Pinterest and Cosmos answer a browser; Are.na's API turns one away (403) and answers a named client */
const BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const TIMEOUT_MS = 15_000;
/** Pages read at most per board, whatever the cap */
const MAX_PAGES = 40;

/** GET or POST, JSON or text, with the platform's status turned into a BoardError */
async function ask(url: string, init: RequestInit & { as: "json" | "text" }): Promise<unknown> {
  let res: Response;
  try {
    res = await safeFetch(url, { ...init, headers: { "User-Agent": BROWSER, ...init.headers }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    throw new BoardError("unavailable", `${url}: ${e instanceof Error ? e.message : e}`);
  }
  if (res.status === 401) throw new BoardError("private", url);
  if (res.status === 404) throw new BoardError("not-found", url);
  if (!res.ok) throw new BoardError("unavailable", `${url}: ${res.status}`);
  try {
    return init.as === "json" ? await res.json() : await res.text();
  } catch (e) {
    throw new BoardError("unavailable", `${url}: ${e instanceof Error ? e.message : e}`);
  }
}

// ─── Are.na ───────────────────────────────────────────────────────────────────
// No token: public and closed channels read alike; a private one answers 401. 30 calls a minute.

const ARENA = "https://api.are.na/v3/channels";
const ARENA_HEADERS = { "User-Agent": "criterio.design (+https://criterio.design)", Accept: "application/json" };

const arena: Reader<RefOf<"arena">> = {
  async read(ref) {
    const slug = encodeURIComponent(ref.slug);
    const { name } = arenaChannel(await ask(`${ARENA}/${slug}`, { as: "json", headers: ARENA_HEADERS }));
    async function* pages(): AsyncGenerator<Page> {
      for (let n = 1; n <= MAX_PAGES; n++) {
        const page = arenaPage(await ask(`${ARENA}/${slug}/contents?per=100&page=${n}`, { as: "json", headers: ARENA_HEADERS }));
        yield page;
        if (!page.more) return;
      }
    }
    return { platform: "arena", url: ref.url, name, ...(await collect(pages())) };
  },
};

// ─── Pinterest ────────────────────────────────────────────────────────────────
// The resource endpoints answer a logged-out reader with these two headers. A secret board answers
// as if it did not exist: Pinterest does not tell the two apart.

const PINTEREST = "https://www.pinterest.com/resource";
const PINTEREST_HEADERS = { "X-Requested-With": "XMLHttpRequest", "X-Pinterest-PWS-Handler": "www/[username]/[slug].js", Accept: "application/json" };

function resource(name: string, sourceUrl: string, options: Record<string, unknown>): string {
  const data = encodeURIComponent(JSON.stringify({ options, context: {} }));
  return `${PINTEREST}/${name}/get/?source_url=${encodeURIComponent(sourceUrl)}&data=${data}`;
}

/** pin.it/<code> -> the board it opens (a pin or a profile behind a short link is not a board) */
async function resolveShort(ref: RefOf<"pinterest">): Promise<{ user: string; slug: string }> {
  if (ref.board) return ref.board;
  let res: Response;
  try {
    res = await safeFetch(ref.url, { headers: { "User-Agent": BROWSER }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    await res.body?.cancel();
  } catch (e) {
    throw new BoardError("unavailable", `${ref.url}: ${e instanceof Error ? e.message : e}`);
  }
  const board = pinterestBoardOf(new URL(res.url))?.board;
  if (!board) throw new BoardError("not-found", `${ref.url} -> ${res.url}`);
  return board;
}

const pinterest: Reader<RefOf<"pinterest">> = {
  async read(ref) {
    const { user, slug } = await resolveShort(ref);
    const source = `/${user}/${slug}/`;
    const board = pinterestBoard(await ask(resource("BoardResource", source, { username: user, slug }), { as: "json", headers: PINTEREST_HEADERS }));
    async function* pages(): AsyncGenerator<Page> {
      let bookmark: string | null = null;
      for (let n = 0; n < MAX_PAGES; n++) {
        const options = { board_id: board.id, board_url: source, page_size: 100, ...(bookmark ? { bookmarks: [bookmark] } : {}) };
        const page = pinterestPage(await ask(resource("BoardFeedResource", source, options), { as: "json", headers: PINTEREST_HEADERS }));
        yield page;
        if (!page.bookmark) return;
        bookmark = page.bookmark;
      }
    }
    return { platform: "pinterest", url: `https://www.pinterest.com${source}`, name: board.name, ...(await collect(pages())) };
  },
};

// ─── Cosmos ───────────────────────────────────────────────────────────────────
// The cluster's page carries its numeric id; its elements come from the GraphQL query the page itself sends.

const COSMOS_GRAPHQL = "https://api.cosmos.so/graphql";
const COSMOS_QUERY = "query GetClusterElements($clusterId:ClusterId$clusterInput:ClusterGetInput$pageCursor:String$userId:UserId$pageSize:Int$isLoggedIn:Boolean!$showCollaborator:Boolean!){clusterConnections(clusterId:$clusterId clusterInput:$clusterInput meta:{pageSize:$pageSize pageCursor:$pageCursor}){items{element{...ElementTile isLikedBy(userId:$userId)@include(if:$isLoggedIn)userContext(userId:$userId)@include(if:$isLoggedIn){...ElementUserContext}connection(cluster:{id:$clusterId})@include(if:$showCollaborator){collaborator{id username avatarUrl isPremium}}}}meta{nextPageCursor count}}}fragment ElementTile on ElementTile{__typename id processingState contentAccessibility createdAt isFeatured isReadyToShow hasIllegalReports ownerId owner{username isVerifiedProfile verifiedProfile{slug brand{__typename id slug}avatarUrl avatarThumbnailCropParameters{width height}}}shareUrl originalClusterId generatedCaption{text __typename}source{...ElementSource}product{...Product}...on MediaElementTile{hasMoreMedia multipleMedia{...ElementMedia}media{...ElementMedia}secondaryMedia{...ElementMedia}}...on ProductElementTile{media{...ElementMedia}productPrice:price{value currency}productBrand:brand productTitle:name productDescription:description}...on WebsiteElementTile{media{...ElementMedia}websiteTitle:title websiteDescription:description}...on TextElementTile{text}}fragment ElementMedia on Media{mediaId url width height notSafeForWorkStatus aiGenerated __typename ...on StaticImage{blurHash}...on AnimatedImage{blurHash video{url thumbnailUrl}}...on Video{thumbnail{hash url}duration isStored mux{playbackUrl mp4Url(quality:LOW)}width height}...on Media{__typename}}fragment ElementSource on ElementSource{url isEditable isPublicDomain author{username fullName profileUrl avatarUrl}}fragment Product on Product{__typename id name description brand{id name slug}listPrice{value currency}salePrice{value currency}availability delistedAt categories{slug}offers{url domain}}fragment ElementUserContext on ElementUserContext{isDisliked isPublicElement connections{meta{count}}}";

const cosmos: Reader<RefOf<"cosmos">> = {
  async read(ref) {
    const cluster = cosmosCluster(String(await ask(ref.url, { as: "text" })));
    if (!cluster) throw new BoardError("not-found", ref.url);
    async function* pages(): AsyncGenerator<Page> {
      let cursor: string | null = null;
      for (let n = 0; n < MAX_PAGES; n++) {
        const variables = { clusterId: cluster!.id, pageSize: 100, pageCursor: cursor, isLoggedIn: false, showCollaborator: false, userId: 0 };
        const page = cosmosPage(await ask(COSMOS_GRAPHQL, {
          as: "json", method: "POST",
          headers: { "Content-Type": "application/json", Origin: "https://www.cosmos.so" },
          body: JSON.stringify({ operationName: "GetClusterElements", query: COSMOS_QUERY, variables }),
        }));
        yield page;
        if (!page.cursor) return;
        cursor = page.cursor;
      }
    }
    return { platform: "cosmos", url: ref.url, name: cluster.name, ...(await collect(pages())) };
  },
};

const READERS: { [P in Platform]: Reader<RefOf<P>> } = { arena, pinterest, cosmos };

/** The board's entries. Throws BoardError: private, not found, or the platform not answering (or answering
 *  something we do not understand). */
export async function readBoard(ref: BoardRef): Promise<Board> {
  try {
    return await (READERS[ref.platform] as Reader<BoardRef>).read(ref);
  } catch (e) {
    if (e instanceof BoardError) throw e;
    if (e instanceof BadAnswer) throw new BoardError("unavailable", e.message);
    throw e;
  }
}
