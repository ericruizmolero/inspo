import { getSession, getCtx, listMembers } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import InspoClient from "@/components/InspoClient";
import GuestStart from "@/components/GuestStart";
import { isAdmin } from "@/lib/activity";


// Sin sesión: el lienzo de inicio como invitado (la primera acción abre la ventana de acceso).
// Con sesión: el workspace activo.
export default async function Home() {
  if (!(await getSession())) return <GuestStart />;
  const ctx = await getCtx();

  const [{ items, thumbnailMap, tagMap }, members, admin] = await Promise.all([
    loadWorkspaceData(ctx.workspace.id),
    listMembers(ctx.workspace.id),
    isAdmin(ctx.user.email),
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
    />
  );
}
