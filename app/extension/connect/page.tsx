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
  const ctx = await getCtxOrLogin("/extension/connect");
  return (
    <div className="auth auth--solo">
      <ActivityPing area="extension" organizationId={ctx.workspace.id} />
      <div className="auth__card">
        <BackLink href="/settings/extension" />
        <ConnectPanel currentId={ctx.workspace.id} youAre={ctx.user.email} />
      </div>
    </div>
  );
}
