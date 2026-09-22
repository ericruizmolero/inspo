import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { getCtx, HttpError } from "@/lib/workspace";
import ConnectPanel from "./ConnectPanel";

export const metadata: Metadata = { title: "Conectar la extensión" };
export const dynamic = "force-dynamic";

// La extensión abre esta pestaña para conectarse: la persona ya está identificada (o entra),
// elige el workspace donde guardará y se genera una llave que la extensión recoge sola
// (extension/chrome/content.js escucha en esta página). Si no la recoge, se puede copiar.
export default async function ConectarPage() {
  let ctx;
  try { ctx = await getCtx(); } catch (e) { if (e instanceof HttpError) redirect("/login?next=/extension/conectar"); throw e; }
  return (
    <div className="page">
      <ActivityPing area="extension" organizationId={ctx.workspace.id} />
      <div className="page__bar">
        <BackLink />
        <span className="display page__title">Conectar la extensión</span>
      </div>
      <ConnectPanel workspaces={ctx.workspaces} currentId={ctx.workspace.id} />
    </div>
  );
}
