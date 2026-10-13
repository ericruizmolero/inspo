// A stored file's address for a reader with no session: an AI client that read criterio.md through MCP, a
// criterio.md taken out in the brand's zip. /api/files asks for a session; this signature, bound to the key and
// to a last day, stands in for it (app/api/files/[...key]/route.ts). Links made before it led the path carry it as ?t=.
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { FILES_BASE } from "./storage";

const DAY = 86400_000;
// Long enough for a chat or a downloaded file to keep showing its pictures, and the same address all day
const VALID_DAYS = 30;

function secret(): string {
  const s = process.env.BETTER_AUTH_SECRET;
  // A known fallback would let anyone sign a link: production has no fallback
  if (!s && process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is not set");
  return s || "dev-file-secret";
}
const sign = (key: string, until: number) => createHmac("sha256", secret()).update(`file|${key}|${until}`).digest("hex").slice(0, 32);

/** The signature leads the path: a fetcher may drop a query (claude.ai's did), never the path */
export const SIGNED_MARK = "~";

/** /api/files/~<last day>.<signature>/<key>, readable without a session until that day ends */
export function signedFilePath(key: string, now = Date.now()): string {
  const until = Math.floor(now / DAY) + VALID_DAYS;
  return `${FILES_BASE}${SIGNED_MARK}${until}.${sign(key, until)}/${key}`;
}

/** Whether `t` is a signature we gave for this key, and its day has not passed */
export function fileTokenValid(key: string, t: string | null, now = Date.now()): boolean {
  const m = t && /^(\d+)\.([0-9a-f]{32})$/.exec(t);
  if (!m) return false;
  const until = Number(m[1]);
  if (until < Math.floor(now / DAY)) return false;
  const good = Buffer.from(sign(key, until));
  const given = Buffer.from(m[2]);
  return good.length === given.length && timingSafeEqual(good, given);
}
