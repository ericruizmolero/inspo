import { redirect } from "next/navigation";
import { getCtx, HttpError, listMembers } from "@/lib/workspace";
import { loadWorkspaceData } from "@/lib/items";
import InspoClient from "@/components/InspoClient";

export const dynamic = "force-dynamic";

export default async function Home() {
  let ctx;
  try {
    ctx = await getCtx();
  } catch (e) {
    if (e instanceof HttpError) redirect("/login");
    throw e;
  }

  const [{ items, thumbnailMap, tagMap }, members] = await Promise.all([
    loadWorkspaceData(ctx.workspace.id),
    listMembers(ctx.workspace.id),
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
      memberNames={members.map((m) => m.name)}
    />
  );
}
