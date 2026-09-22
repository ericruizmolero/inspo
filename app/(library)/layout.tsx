import { getSession, getCtx, listMembers } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import InspoClient from "@/components/InspoClient";
import type { ReactNode } from "react";
import { isAdmin } from "@/lib/activity";
import { quotaStatus } from "@/lib/quota";
import { listComments } from "@/lib/comments";
import { designMdIndexFor } from "@/lib/design-store";
import { sidebarOpen } from "@/lib/sidebar-state";


// The library lives in this layout so it stays mounted between / and /i/[id]: opening a DESIGN.md
// changes the URL (history.pushState) without a remount, and a refresh keeps the running jobs.
// Sin sesión: the pages decide (/ shows the guest start, /i/[id] sends to login).
export default async function LibraryLayout({ children }: { children: ReactNode }) {
  if (!(await getSession())) return children;
  const ctx = await getCtx();

  const ws = ctx.workspace;
  // Todo lo que la biblioteca necesita al abrir, en paralelo y antes de pintar
  const [{ items, thumbnailMap, tagMap }, members, admin, quota, comments, designMdIndex, open] = await Promise.all([
    loadWorkspaceData(ws.id),
    listMembers(ws.id),
    isAdmin(ctx.user.email),
    quotaStatus(ws),
    listComments(ws.id),
    designMdIndexFor(ws.id),
    sidebarOpen(),
  ]);

  return (
    <>
    {/* key: al cambiar de workspace se remonta el cliente (estado de items y filtros limpio) */}
    <InspoClient
      key={ctx.workspace.id}
      items={items}
      initialThumbnailMap={thumbnailMap}
      initialTagMap={tagMap}
      aiEnabled={!!process.env.TYPESAFE_API_KEY}
      user={ctx.user}
      workspace={ctx.workspace}
      workspaces={ctx.workspaces}
      members={members.map((m) => ({ name: m.name, image: m.image ?? null }))}
      isAdmin={admin}
      initialQuota={quota}
      initialComments={comments}
      initialDesignMdIndex={designMdIndex}
      initialSidebarOpen={open}
    />
    {children}
    </>
  );
}
