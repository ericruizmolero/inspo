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

// The extension opens this tab to connect: the person is already signed in (or signs in),
// picks the workspace to save to, and a key is generated that the extension picks up on its own
// (extension/chrome/content.js listens on this page). If it does not, the key can be copied.
export default async function ConnectPage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/extension/connect"), getT()]);
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
