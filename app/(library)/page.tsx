import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getCtx, getSession } from "@/lib/workspace";

const P = schema.project;

// The library's server actions run here: an add tags its item after answering (app/actions/library.ts)
export const maxDuration = 300;

// With a session the library is the layout; this page only adds the moves an address asks for.
// Without one it is the sign-in: app.criterio.design is the door for people with an account, and the landing lives on
// criterio.design (the login links to it). proxy.ts sends a browser with no session cookie; this covers a stale one.
// The address comes back after signing in: ?add=<url> (the marketing site's "Save to Criterio") saves itself then
export default async function Home({ searchParams }: { searchParams: Promise<{ add?: string; in?: string; view?: string; moved?: string }> }) {
  const params = await searchParams;
  if (!(await getSession())) {
    const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string")).toString();
    redirect(query ? `/login?next=${encodeURIComponent(`/?${query}`)}` : "/login");
  }
  // An address to a project in another of this person's workspaces: /p/ moves there first. `moved` ends it if that failed
  const { in: place, view, moved } = params;
  if (place && !moved) {
    const ctx = await getCtx();
    const [project] = await db.select({ organizationId: P.organizationId }).from(P).where(and(eq(P.id, place), inArray(P.organizationId, ctx.workspaces.map((w) => w.id)))).limit(1);
    if (project && project.organizationId !== ctx.workspace.id) redirect(`/p/${encodeURIComponent(place)}${view ? `?view=${encodeURIComponent(view)}` : "?view=board"}`);
  }
  return null;
}
