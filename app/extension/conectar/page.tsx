import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { getCtx, HttpError } from "@/lib/workspace";
import ConnectPanel from "./ConnectPanel";
import { getT } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.ext.connect };
}

// La extensión abre esta pestaña para conectarse: la persona ya está identificada (o entra),
// elige el workspace donde guardará y se genera una llave que la extensión recoge sola
// (extension/chrome/content.js escucha en esta página). Si no la recoge, se puede copiar.
export default async function ConectarPage() {
  let ctx;
  try { ctx = await getCtx(); } catch (e) { if (e instanceof HttpError) redirect("/login?next=/extension/conectar"); throw e; }
  const { t } = await getT();
  return (
    <div className="page">
      <ActivityPing area="extension" organizationId={ctx.workspace.id} />
      <div className="page__bar">
        <BackLink />
        <span className="display page__title">{t.ext.connect}</span>
      </div>
      <ConnectPanel workspaces={ctx.workspaces} currentId={ctx.workspace.id} />
    </div>
  );
}
