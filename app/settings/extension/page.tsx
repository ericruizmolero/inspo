import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin, canManage } from "@/lib/workspace";
import { listExtKeys } from "@/lib/ext-keys";
import { getT } from "@/lib/i18n";
import ExtensionPanel from "../_components/ExtensionPanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.extension };
}

export default async function ExtensionPage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/extension"), getT()]);
  const ws = ctx.workspace;
  const keys = await listExtKeys(ws.id);
  return (
    <>
      <ActivityPing area="settings" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.extension} lead={t.settings.leads.extension} />
      <ExtensionPanel
        me={ctx.user}
        canManage={canManage(ws.role)}
        extKeys={keys.map((k) => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null }))}
      />
    </>
  );
}
