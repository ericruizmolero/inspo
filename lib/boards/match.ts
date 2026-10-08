// Which pasted addresses are a board on another platform: the one place that recognizes them.
// Pure and client-safe: the paste fields ask it to turn "Save" into "Import board".
// Reading a board (network) is lib/boards/read.ts.

export type Platform = "arena" | "pinterest" | "cosmos";

export type BoardRef =
  | { platform: "arena"; url: string; slug: string }
  /** `board` is null for a pin.it short link: it is resolved when the board is read */
  | { platform: "pinterest"; url: string; board: { user: string; slug: string } | null }
  | { platform: "cosmos"; url: string; user: string; slug: string };

export type RefOf<P extends Platform> = Extract<BoardRef, { platform: P }>;

/** Names only to say where a board comes from, never as a logo */
export const PLATFORM_NAME: Record<Platform, string> = { arena: "Are.na", pinterest: "Pinterest", cosmos: "Cosmos" };

const segments = (u: URL) => u.pathname.split("/").filter(Boolean).map(decodeURIComponent);

/** are.na/<user>/<slug> or are.na/channel/<slug>. Only the slug names the channel. */
function matchArena(u: URL): RefOf<"arena"> | null {
  if (!/^(www\.)?are\.na$/.test(u.hostname)) return null;
  const [first, slug] = segments(u);
  if (!first || !slug || ["block", "search", "explore", "settings", "about"].includes(first)) return null;
  return { platform: "arena", url: `https://www.are.na/${first}/${slug}`, slug };
}

/** Any Pinterest (pinterest.es, es.pinterest.com) and pin.it short links. A section reads its whole board.
 *  Same host rules as `boardUrl` in extension/chrome/import.js. */
function matchPinterest(u: URL): RefOf<"pinterest"> | null {
  if (u.hostname === "pin.it") {
    const [code] = segments(u);
    return code ? { platform: "pinterest", url: `https://pin.it/${code}`, board: null } : null;
  }
  return pinterestBoardOf(u);
}

/** A board's path on any Pinterest host; null if the path is not a board */
export function pinterestBoardOf(u: URL): RefOf<"pinterest"> | null {
  if (!/(^|\.)pinterest\.[a-z]{2,3}(\.[a-z]{2})?$/.test(u.hostname)) return null;
  const parts = segments(u);
  if (parts.length < 2 || parts.length > 3 || ["pin", "search", "ideas", "today", "_", "resource"].includes(parts[0])) return null;
  const [user, slug] = parts;
  return { platform: "pinterest", url: `https://www.pinterest.com/${user}/${slug}/`, board: { user, slug } };
}

/** cosmos.so/<user>/<cluster> */
function matchCosmos(u: URL): RefOf<"cosmos"> | null {
  if (!/^(www\.)?cosmos\.so$/.test(u.hostname)) return null;
  const parts = segments(u);
  if (parts.length !== 2 || ["e", "discover", "search", "settings", "p"].includes(parts[0])) return null;
  const [user, slug] = parts;
  return { platform: "cosmos", url: `https://www.cosmos.so/${user}/${slug}`, user, slug };
}

const MATCHERS: Record<Platform, (u: URL) => BoardRef | null> = { arena: matchArena, pinterest: matchPinterest, cosmos: matchCosmos };

/** The board a pasted text points to, or null when it is anything else (a site, a pin, a profile) */
export function boardOf(input: string): BoardRef | null {
  const s = input.trim();
  if (!s || /\s/.test(s)) return null;
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  if (!/^https?:$/.test(u.protocol)) return null;
  u.hostname = u.hostname.toLowerCase();
  for (const match of Object.values(MATCHERS)) {
    const ref = match(u);
    if (ref) return ref;
  }
  return null;
}
