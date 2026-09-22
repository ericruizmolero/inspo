import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { getCtxOrLogin } from "@/lib/workspace";
import ConnectPanel from "./ConnectPanel";
import { getT } from "@/lib/i18n";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.ext.connect };
}

// La extensión abre esta pestaña para conectarse: la persona ya está identificada (o entra),
// elige el workspace donde guardará y se genera una llave que la extensión recoge sola
// (extension/chrome/content.js escucha en esta página). Si no la recoge, se puede copiar.
export default async function ConectarPage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/extension/conectar"), getT()]);
  return (
    <div className="page">
      <ActivityPing area="extension" organizationId={ctx.workspace.id} />
      <header className="page__head">
        <BackLink href="/settings/extension" />
        <h1 className="display page__title">{t.ext.connect}</h1>
      </header>
      <ConnectPanel workspaces={ctx.workspaces} currentId={ctx.workspace.id} />
    </div>
  );
}
