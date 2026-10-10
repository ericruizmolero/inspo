// What tests/setup.ts mocks read and what tests set: who is signed in, the request's headers and cookies,
// the in-memory file store, and every external call something tried to make.

export interface Actor { id: string; name: string; email: string; workspaceId: string }

let actor: Actor | null = null;
let headerInit: Record<string, string> = {};
const jar = new Map<string, string>();

/** Signs `who` in with `who.workspaceId` active, or signs out with null. Headers and cookies start empty. */
export function actAs(who: Actor | null, headers: Record<string, string> = {}) {
  actor = who;
  headerInit = headers;
  jar.clear();
}

export function currentSession() {
  if (!actor) return null;
  const now = new Date();
  return {
    user: { id: actor.id, name: actor.name, email: actor.email, image: null, emailVerified: true, language: "en", createdAt: now, updatedAt: now },
    session: { id: `session-${actor.id}`, userId: actor.id, token: "test", expiresAt: new Date(+now + 3_600_000), createdAt: now, updatedAt: now, activeOrganizationId: actor.workspaceId },
  };
}

export const requestHeaders = () => new Headers(headerInit);

export const cookieJar = {
  get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
  getAll: () => [...jar].map(([name, value]) => ({ name, value })),
  has: (name: string) => jar.has(name),
  set: (name: string | { name: string; value: string }, value?: string) => {
    if (typeof name === "string") jar.set(name, value ?? ""); else jar.set(name.name, name.value);
  },
  delete: (name: string) => { jar.delete(name); },
};

/** What next/navigation's redirect() and notFound() throw in tests */
export class NavigationThrow extends Error {
  constructor(public kind: "redirect" | "notFound" | "forbidden" | "unauthorized", public url?: string) {
    super(url ? `${kind} ${url}` : kind);
  }
}

/** The meaning vector of every query in tests, and of A's item (lib/embed.ts has 1024 dimensions) */
export const UNIT_VECTOR = Array.from({ length: 1024 }, () => 1 / 32);

/** The bucket, in memory: no test can write to R2 */
export const files = new Map<string, { body: Buffer; contentType: string }>();

/** Every model call, email, capture, queue send or outside fetch a test reached: [what, detail] */
export const reached: [string, unknown][] = [];

/** Records an external call and refuses it */
export function blocked(what: string, detail?: unknown): never {
  reached.push([what, detail]);
  throw new Error(`external call in a test: ${what}`);
}
