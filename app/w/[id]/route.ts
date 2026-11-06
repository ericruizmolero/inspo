// A workspace's address outside the app: the extension's "Open the library" after an import to the Inbox. `/?in=`
// only looks in the active workspace, so an import into another of the person's workspaces opened the wrong one.
// This makes that workspace the active one, then opens `?in=` (the Inbox by default). A workspace that is not theirs
// goes home, saying nothing about it. The twin of /p/[id].
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCtxOrLogin } from "@/lib/workspace";
import { log } from "@/lib/log";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getCtxOrLogin(`/w/${encodeURIComponent(id)}`);
  if (!ctx.workspaces.some((w) => w.id === id)) redirect("/");
  const asked = new URL(req.url).searchParams;
  const to = new URL("/", req.url);
  to.searchParams.set("in", asked.get("in") || "inbox");
  const home = NextResponse.redirect(to);
  if (id === ctx.workspace.id) return home;
  home.headers.set("Location", `${to.toString()}&moved=1`);
  // The session sits in a cached cookie for minutes, so the change has to reach the browser in this answer
  const changed = await auth.api.setActiveOrganization({ headers: await headers(), body: { organizationId: id }, asResponse: true }).catch((err) => { log.warn("workspace.active_not_saved", { err }); return null; });
  for (const cookie of changed?.headers.getSetCookie() ?? []) home.headers.append("Set-Cookie", cookie);
  return home;
}
