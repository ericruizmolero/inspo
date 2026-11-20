import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin, canManage, accountOf, type Ctx } from "@/lib/workspace";
import { getT, type Dict } from "@/lib/i18n";
import { countWorkspaces } from "@/lib/quota";
import { planOf } from "@/lib/plans";
import WorkspacePanel from "../_components/WorkspacePanel";

const leadOf = (t: Dict, ws: Ctx["workspace"]) => (ws.kind === "personal" ? t.settings.leads.personal : t.settings.leads.workspace(ws.name));

export async function generateMetadata(): Promise<Metadata> {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/workspace"), getT()]);
  return { title: t.settings.sections.workspace, description: leadOf(t, ctx.workspace) };
}

export default async function WorkspacePage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/workspace"), getT()]);
  const ws = ctx.workspace;
  const account = await accountOf(ws.id);
  const payer = account?.ownerUserId === ctx.user.id;
  // An import may make a new team only where its payer could open one by hand: a plan with room for another workspace
  const roomForTeam = !!account && payer && (planOf(account.plan).workspaces ?? Infinity) > (await countWorkspaces(account.id));
  return (
    <>
      <ActivityPing area="settings" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.workspace} lead={leadOf(t, ws)} />
      <WorkspacePanel workspace={ws} workspaces={ctx.workspaces} me={ctx.user} canManage={canManage(ws.role)} roomForTeam={roomForTeam} />
    </>
  );
}
