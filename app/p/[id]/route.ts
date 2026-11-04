// A project's address outside the app: what an agent hands the person. `/?in=` only looks in the active workspace, so a
// project in another one of theirs opened something else. This moves to the project's workspace first. A project that is
// not theirs goes home, saying nothing about it.
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getCtxOrLogin } from "@/lib/workspace";
import { log } from "@/lib/log";

const P = schema.project;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtxOrLogin(`/p/${encodeURIComponent(id)}`);
  const [project] = await db.select({ organizationId: P.organizationId }).from(P).where(and(eq(P.id, id), inArray(P.organizationId, ctx.workspaces.map((w) => w.id)))).limit(1);
  if (!project) redirect("/");
  const home = NextResponse.redirect(new URL(`/?in=${encodeURIComponent(id)}&view=system`, req.url));
  if (project.organizationId === ctx.workspace.id) return home;
  // The session sits in a cached cookie for minutes, so the change has to reach the browser in this answer
  const changed = await auth.api.setActiveOrganization({ headers: await headers(), body: { organizationId: project.organizationId }, asResponse: true }).catch((err) => { log.warn("workspace.active_not_saved", { err }); return null; });
  for (const cookie of changed?.headers.getSetCookie() ?? []) home.headers.append("Set-Cookie", cookie);
  return home;
}
