import { getSession, getCtx, listMembers } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import InspoClient from "@/components/InspoClient";
import GuestStart from "@/components/GuestStart";
import { isAdmin } from "@/lib/activity";
import { quotaStatus } from "@/lib/quota";
import { listComments } from "@/lib/comments";
import { designMdIndexFor } from "@/lib/design-store";


// Sin sesión: el lienzo de inicio como invitado (la primera acción abre la ventana de acceso).
// Con sesión: el workspace activo.
export default async function Home() {
  if (!(await getSession())) return <GuestStart />;
  const ctx = await getCtx();

  const ws = ctx.workspace;
  // Todo lo que la biblioteca necesita al abrir, en paralelo y antes de pintar
  const [{ items, thumbnailMap, tagMap }, members, admin, quota, comments, designMdIndex] = await Promise.all([
    loadWorkspaceData(ws.id),
    listMembers(ws.id),
    isAdmin(ctx.user.email),
    quotaStatus(ws),
    listComments(ws.id),
    designMdIndexFor(ws.id),
  ]);

  return (
    // key: al cambiar de workspace se remonta el cliente (estado de items y filtros limpio)
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
    />
  );
}
