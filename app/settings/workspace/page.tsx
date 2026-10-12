import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin, canManage, type Ctx } from "@/lib/workspace";
import { getT, type Dict } from "@/lib/i18n";
import WorkspacePanel from "../_components/WorkspacePanel";

const leadOf = (t: Dict, ws: Ctx["workspace"]) => (ws.kind === "personal" ? t.settings.leads.personal : t.settings.leads.workspace(ws.name));

export async function generateMetadata(): Promise<Metadata> {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/workspace"), getT()]);
  return { title: t.settings.sections.workspace, description: leadOf(t, ctx.workspace) };
}

export default async function WorkspacePage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/workspace"), getT()]);
  const ws = ctx.workspace;
  return (
    <>
      <ActivityPing area="settings" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.workspace} lead={leadOf(t, ws)} />
      <WorkspacePanel workspace={ws} workspaces={ctx.workspaces} me={ctx.user} canManage={canManage(ws.role)} />
    </>
  );
}
