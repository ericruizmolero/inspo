import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin, canManage } from "@/lib/workspace";
import { getT } from "@/lib/i18n";
import WorkspacePanel from "../_components/WorkspacePanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.workspace };
}

export default async function WorkspacePage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/workspace"), getT()]);
  const ws = ctx.workspace;
  return (
    <>
      <ActivityPing area="settings" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.workspace} lead={ws.kind === "personal" ? t.settings.leads.personal : t.settings.leads.workspace(ws.name)} />
      <WorkspacePanel workspace={ws} canManage={canManage(ws.role)} />
    </>
  );
}
