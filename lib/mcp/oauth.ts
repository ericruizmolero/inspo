// The authorization server behind criterio's MCP connector (app/mcp/route.ts): OAuth 2.1 as the MCP
// authorization spec asks for it. An AI client registers itself (RFC 7591), sends the person to
// /mcp/authorize, and exchanges the code it gets back for an access token (one hour) and a refresh token
// (sixty days, rotated on every use). Authorization code with PKCE (S256) only; no implicit, no password.
// Tokens are random and opaque: the database keeps their SHA-256, never the token.
//
// A grant belongs to the person, not to a workspace: like an extension key (lib/ext-keys.ts) it opens every
// workspace they are a member of, checked again on each request.
import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { and, desc, eq, gt, isNotNull, isNull, or } from "drizzle-orm";
import { db, schema } from "../db";
import { newId } from "../workspace-core";
import { log } from "../log";
import { sha256 } from "../hash";

const C = schema.mcpClient;
const G = schema.mcpGrant;

export const ACCESS_TTL_S = 60 * 60;
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 5 * 60 * 1000;
/** A client that lost the answer to a refresh may ask again with the same token for this long */
const ROTATION_GRACE_MS = 60 * 1000;
/** How often lastUsedAt is written */
const TOUCH_EVERY_MS = 5 * 60 * 1000;

export const ACCESS_PREFIX = "crit_at_";
const REFRESH_PREFIX = "crit_rt_";
const CODE_PREFIX = "crit_ac_";

const secret = (prefix: string) => prefix + randomBytes(32).toString("base64url");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** An OAuth error as the token and registration endpoints answer it (RFC 6749 §5.2) */
export class OAuthError extends Error {
  constructor(public code: string, message: string, public status = 400) { super(message); }
}

// ─── Redirect addresses ──────────────────────────────────────────────────────

const LOOPBACK = /^(localhost|127\.0\.0\.1|\[::1\])$/;
/** Schemes a browser would run or read instead of handing the code to an app */
const UNSAFE_SCHEME = /^(javascript|data|vbscript|file|blob|about|view-source|ws|wss|ftp):$/i;

/** Where a code may be sent: https anywhere, http only on this machine (a desktop client listening on a port),
 *  or an app's own scheme (cursor://…). No fragments. */
export function validRedirect(uri: string): boolean {
  if (typeof uri !== "string" || uri.length > 2000) return false;
  let u: URL;
  try { u = new URL(uri); } catch { return false; }
  if (u.hash || u.username || u.password) return false;
  if (u.protocol === "https:") return true;
  if (u.protocol === "http:") return LOOPBACK.test(u.hostname);
  return !UNSAFE_SCHEME.test(u.protocol);
}

/** Exact match, except a loopback address, whose port the client picks each time (RFC 8252 §7.3) */
function redirectMatches(registered: string, given: string): boolean {
  if (registered === given) return true;
  try {
    const a = new URL(registered), b = new URL(given);
    return a.protocol === "http:" && b.protocol === "http:" && LOOPBACK.test(a.hostname) && LOOPBACK.test(b.hostname)
      && a.hostname === b.hostname && a.pathname === b.pathname && a.search === b.search;
  } catch { return false; }
}

// ─── Registration (RFC 7591) ─────────────────────────────────────────────────

const cleanName = (v: unknown) => String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

/** Registers an app. Open to anyone, as the spec has it: a registration opens nothing by itself. */
export async function registerClient(body: unknown) {
  const b = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const uris = Array.isArray(b.redirect_uris) ? b.redirect_uris : [];
  if (!uris.length || uris.length > 10 || !uris.every((u) => typeof u === "string" && validRedirect(u))) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris must be 1 to 10 https, loopback http or app-scheme addresses");
  }
  // A client that names no method is treated as public: PKCE is required of everyone anyway
  const method = b.token_endpoint_auth_method === "client_secret_post" || b.token_endpoint_auth_method === "client_secret_basic" ? b.token_endpoint_auth_method : "none";
  const clientSecret = method === "none" ? null : secret("crit_cs_");
  const row = { id: `crit_app_${randomBytes(12).toString("base64url")}`, name: cleanName(b.client_name), redirectUris: uris as string[], secretHash: clientSecret ? sha256(clientSecret) : null, createdAt: new Date() };
  await db.insert(C).values(row);
  return {
    client_id: row.id,
    ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
    client_id_issued_at: Math.floor(+row.createdAt / 1000),
    client_name: row.name, redirect_uris: row.redirectUris,
    token_endpoint_auth_method: method, grant_types: ["authorization_code", "refresh_token"], response_types: ["code"],
  };
}

// ─── Authorization ───────────────────────────────────────────────────────────

export interface AuthRequest {
  clientId: string; clientName: string; redirectUri: string; codeChallenge: string; state: string | null;
}
/** What the consent page shows instead of asking: the request cannot be trusted enough to send anyone back */
export type AuthRequestError = { fatal: true; reason: "client" | "redirect" } | { fatal: false; redirect: string };

const backWith = (redirectUri: string, params: Record<string, string | null>) => {
  const u = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v !== null) u.searchParams.set(k, v);
  return u.toString();
};

/**
 * Reads the query of /mcp/authorize. An unknown app or an address it did not register is fatal (the person stays
 * on our page); anything else wrong goes back to the app as an OAuth error. `resource`, when the client names
 * one, has to be this connector.
 */
export async function readAuthRequest(q: Record<string, string | undefined>, origin: string): Promise<AuthRequest | AuthRequestError> {
  const [client] = q.client_id ? await db.select().from(C).where(eq(C.id, q.client_id)).limit(1) : [];
  if (!client) return { fatal: true, reason: "client" };
  const redirectUri = q.redirect_uri ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : "");
  if (!redirectUri || !validRedirect(redirectUri) || !client.redirectUris.some((r) => redirectMatches(r, redirectUri))) return { fatal: true, reason: "redirect" };
  const state = q.state ?? null;
  const fail = (error: string, error_description: string): AuthRequestError => ({ fatal: false, redirect: backWith(redirectUri, { error, error_description, state, iss: origin }) });
  if (q.response_type !== "code") return fail("unsupported_response_type", "only response_type=code");
  if (!q.code_challenge || !/^[A-Za-z0-9_-]{43,128}$/.test(q.code_challenge) || q.code_challenge_method !== "S256") return fail("invalid_request", "PKCE with code_challenge_method=S256 is required");
  if (q.resource && !sameResource(q.resource, origin)) return fail("invalid_target", "unknown resource");
  return { clientId: client.id, clientName: client.name, redirectUri, codeChallenge: q.code_challenge, state };
}

/** The connector's own address, however the client wrote it */
export const sameResource = (resource: string, origin: string) => {
  const r = resource.replace(/\/+$/, "");
  return r === `${origin}/mcp` || r === origin;
};

/** The person said yes: a one-use code, and where to take it */
export async function approve(req: AuthRequest, userId: string, origin: string): Promise<string> {
  const code = secret(CODE_PREFIX);
  const now = new Date();
  await db.insert(G).values({
    id: newId(), clientId: req.clientId, userId, codeHash: sha256(code), codeExpiresAt: new Date(+now + CODE_TTL_MS),
    codeChallenge: req.codeChallenge, redirectUri: req.redirectUri, createdAt: now,
  });
  return backWith(req.redirectUri, { code, state: req.state, iss: origin });
}

export const deny = (req: AuthRequest, origin: string) => backWith(req.redirectUri, { error: "access_denied", error_description: "the person declined", state: req.state, iss: origin });

// ─── Tokens ──────────────────────────────────────────────────────────────────

async function clientFor(clientId: string | undefined, clientSecret: string | undefined) {
  const [client] = clientId ? await db.select().from(C).where(eq(C.id, clientId)).limit(1) : [];
  if (!client) throw new OAuthError("invalid_client", "unknown client", 401);
  if (client.secretHash && !(clientSecret && same(sha256(clientSecret), client.secretHash))) throw new OAuthError("invalid_client", "bad client credentials", 401);
  return client;
}

function issue() {
  const access = secret(ACCESS_PREFIX), refresh = secret(REFRESH_PREFIX);
  const now = Date.now();
  return {
    set: { accessHash: sha256(access), accessExpiresAt: new Date(now + ACCESS_TTL_S * 1000), refreshHash: sha256(refresh), refreshExpiresAt: new Date(now + REFRESH_TTL_MS) },
    body: { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: SCOPE },
  };
}

export const SCOPE = "criterio";

/** grant_type=authorization_code */
export async function exchangeCode(p: { code?: string; clientId?: string; clientSecret?: string; redirectUri?: string; codeVerifier?: string; resource?: string }, origin: string) {
  const client = await clientFor(p.clientId, p.clientSecret);
  const [grant] = p.code ? await db.select().from(G).where(eq(G.codeHash, sha256(p.code))).limit(1) : [];
  if (!grant || grant.clientId !== client.id || grant.revokedAt) throw new OAuthError("invalid_grant", "unknown code");
  if (grant.codeUsedAt) {
    // A code presented twice: whoever holds the tokens of the first exchange may not be who was approved
    await db.update(G).set({ revokedAt: new Date() }).where(eq(G.id, grant.id));
    throw new OAuthError("invalid_grant", "code already used");
  }
  if (grant.codeExpiresAt < new Date()) throw new OAuthError("invalid_grant", "code expired");
  if (p.redirectUri && p.redirectUri !== grant.redirectUri) throw new OAuthError("invalid_grant", "redirect_uri does not match");
  if (p.resource && !sameResource(p.resource, origin)) throw new OAuthError("invalid_target", "unknown resource");
  const challenge = p.codeVerifier && /^[A-Za-z0-9._~-]{43,128}$/.test(p.codeVerifier) ? createHash("sha256").update(p.codeVerifier).digest("base64url") : "";
  if (!challenge || !same(challenge, grant.codeChallenge)) throw new OAuthError("invalid_grant", "code_verifier does not match");
  const t = issue();
  // Two exchanges racing: only one finds the code unused
  const done = await db.update(G).set({ ...t.set, codeUsedAt: new Date() }).where(and(eq(G.id, grant.id), isNull(G.codeUsedAt))).returning({ id: G.id });
  if (!done.length) throw new OAuthError("invalid_grant", "code already used");
  return t.body;
}

/** grant_type=refresh_token: the token is replaced on every use */
export async function refreshTokens(p: { refreshToken?: string; clientId?: string; clientSecret?: string }) {
  const client = await clientFor(p.clientId, p.clientSecret);
  const hash = p.refreshToken ? sha256(p.refreshToken) : "";
  const [grant] = hash ? await db.select().from(G).where(or(eq(G.refreshHash, hash), eq(G.prevRefreshHash, hash))).limit(1) : [];
  if (!grant || grant.clientId !== client.id || grant.revokedAt) throw new OAuthError("invalid_grant", "unknown refresh token");
  const now = new Date();
  if (grant.refreshHash !== hash) {
    // The token from before the last rotation. Right after it, a client that never got the answer is asking
    // again; later, it is a copy of a token that was already spent
    if (!grant.rotatedAt || +now - +grant.rotatedAt > ROTATION_GRACE_MS) {
      await db.update(G).set({ revokedAt: now }).where(eq(G.id, grant.id));
      throw new OAuthError("invalid_grant", "refresh token already used");
    }
  } else if (!grant.refreshExpiresAt || grant.refreshExpiresAt < now) throw new OAuthError("invalid_grant", "refresh token expired");
  const t = issue();
  const done = await db.update(G).set({ ...t.set, prevRefreshHash: hash, rotatedAt: now })
    .where(and(eq(G.id, grant.id), isNull(G.revokedAt), or(eq(G.refreshHash, hash), eq(G.prevRefreshHash, hash)))).returning({ id: G.id });
  if (!done.length) throw new OAuthError("invalid_grant", "unknown refresh token");
  return t.body;
}

/** RFC 7009: an access or a refresh token ends its grant. Unknown tokens are not an error. */
export async function revokeToken(token: string | undefined): Promise<void> {
  if (!token) return;
  const hash = sha256(token);
  await db.update(G).set({ revokedAt: new Date() }).where(and(isNull(G.revokedAt), or(eq(G.accessHash, hash), eq(G.refreshHash, hash))));
}

/** Who a bearer token speaks for, and the app it was given to. Null when unknown, expired or revoked. */
export async function grantByAccessToken(token: string): Promise<{ id: string; userId: string; clientName: string } | null> {
  const [row] = await db.select({ id: G.id, userId: G.userId, clientName: C.name, lastUsedAt: G.lastUsedAt })
    .from(G).innerJoin(C, eq(C.id, G.clientId))
    .where(and(eq(G.accessHash, sha256(token)), isNull(G.revokedAt), gt(G.accessExpiresAt, new Date()))).limit(1);
  if (!row) return null;
  if (!row.lastUsedAt || Date.now() - +row.lastUsedAt > TOUCH_EVERY_MS) {
    void db.update(G).set({ lastUsedAt: new Date() }).where(eq(G.id, row.id)).catch((err) => log.warn("mcp.grant_not_touched", { ref: row.id, err }));
  }
  return { id: row.id, userId: row.userId, clientName: row.clientName };
}

// ─── The person's connections ────────────────────────────────────────────────

export interface McpConnection { id: string; app: string; createdAt: string; lastUsedAt: string | null }

/** The apps this person let in that can still get in */
export async function listConnections(userId: string): Promise<McpConnection[]> {
  const rows = await db.select({ id: G.id, app: C.name, createdAt: G.createdAt, lastUsedAt: G.lastUsedAt })
    .from(G).innerJoin(C, eq(C.id, G.clientId))
    .where(and(eq(G.userId, userId), isNull(G.revokedAt), isNotNull(G.codeUsedAt), gt(G.refreshExpiresAt, new Date())))
    .orderBy(desc(G.createdAt));
  return rows.map((r) => ({ id: r.id, app: r.app, createdAt: r.createdAt.toISOString(), lastUsedAt: r.lastUsedAt?.toISOString() ?? null }));
}

export async function revokeConnection(userId: string, id: string): Promise<void> {
  await db.update(G).set({ revokedAt: new Date() }).where(and(eq(G.userId, userId), eq(G.id, String(id)), isNull(G.revokedAt)));
}
