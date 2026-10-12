import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin } from "@/lib/workspace";
import { getT } from "@/lib/i18n";
import { personalInvites } from "@/lib/access";
import InvitePanel from "../_components/InvitePanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.invite, description: t.settings.leads.invite };
}

export default async function InvitePage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/invite"), getT()]);
  const { left, invites } = await personalInvites(ctx.user.id);
  return (
    <>
      <ActivityPing area="settings" organizationId={ctx.workspace.id} />
      <SettingsHeading title={t.settings.sections.invite} lead={t.settings.leads.invite} />
      <InvitePanel left={left} invites={invites.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }))} />
    </>
  );
}
