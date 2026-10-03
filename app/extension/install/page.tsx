import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { getCtxOrLogin } from "@/lib/workspace";
import { getT } from "@/lib/i18n";
import manifest from "@/extension/chrome/manifest.json";
import InstallGuide from "./InstallGuide";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.ext.install.title };
}

// The way in for someone who does not have the extension yet: download, load it in Chrome, connect.
// While it is not in the Chrome Web Store it is installed by hand, from the zip at /extension/download.
// The extension opens this page itself right after it is installed (extension/chrome/background.js),
// and from then on the page can see it (content.js) and offers to connect.
export default async function InstallPage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/extension/install"), getT()]);
  return (
    <div className="page">
      <ActivityPing area="extension" organizationId={ctx.workspace.id} />
      <header className="page__head">
        <BackLink href="/settings/extension" />
        <div className="page__heading">
          <h1 className="display page__title">{t.ext.install.title}</h1>
          <p className="page__lead">{t.ext.install.lead}</p>
        </div>
      </header>
      <InstallGuide currentId={ctx.workspace.id} latest={manifest.version} />
    </div>
  );
}
