// Who is calling the MCP connector (app/mcp/route.ts). Two kinds of bearer token get in: the access token of an
// approved app (lib/mcp/oauth.ts), and an access key (lib/ext-keys.ts) for clients and scripts that cannot do
// OAuth. Either way the caller is a person, with every workspace they are a member of today.
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { listWorkspaces, type SessionUser, type Workspace } from "../workspace-core";
import { toLocale } from "../i18n/locale";
import { authByExtKey } from "../ext-keys";
import { APP_URL } from "../auth";
import { ACCESS_PREFIX, grantByAccessToken } from "./oauth";

export interface McpCtx {
  user: SessionUser;
  workspaces: Workspace[];
  /** The app on the other end, as what it writes is signed: "Claude", or the name of the key used */
  via: string;
}

/** The app's own name is whatever it registered with: kept short, and never empty */
const viaOf = (name: string) => name.replace(/\s*\(.*\)\s*$/, "").trim().slice(0, 40) || "MCP";

export async function authMcp(req: Request): Promise<McpCtx | null> {
  const authorization = req.headers.get("authorization");
  const token = /^Bearer\s+(\S+)$/i.exec(authorization ?? "")?.[1];
  if (!token) return null;
  if (token.startsWith(ACCESS_PREFIX)) {
    const grant = await grantByAccessToken(token);
    if (!grant) return null;
    const U = schema.user;
    const [u] = await db.select({ id: U.id, name: U.name, email: U.email, image: U.image, language: U.language }).from(U).where(eq(U.id, grant.userId)).limit(1);
    if (!u) return null;
    const workspaces = await listWorkspaces(u.id);
    return workspaces.length ? { user: { ...u, language: toLocale(u.language) }, workspaces, via: viaOf(grant.clientName) } : null;
  }
  const ctx = await authByExtKey(`Bearer ${token}`);
  if (!ctx || ctx === "forbidden") return null;
  const K = schema.extKey;
  const [key] = await db.select({ name: K.name }).from(K).where(eq(K.id, ctx.keyId)).limit(1);
  return { user: ctx.user, workspaces: ctx.workspaces, via: viaOf(key?.name ?? "") };
}

/**
 * The public address a request was made to: the issuer, and what the connector's own links start with.
 * Production has it fixed (APP_URL); development and previews read it from the request, whose port changes.
 */
export function originOfHeaders(h: Headers, fallback = ""): string {
  if (APP_URL) return APP_URL.replace(/\/+$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return fallback;
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.0\.0\.1)(:|$)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
export const originOf = (req: Request) => originOfHeaders(req.headers, new URL(req.url).origin);

/** Headers for the endpoints an AI client calls from anywhere, a browser included: no cookies are read there,
 *  so any origin may call them */
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
} as const;
