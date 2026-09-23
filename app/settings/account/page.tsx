import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin } from "@/lib/workspace";
import { getT } from "@/lib/i18n";
import AccountPanel from "../_components/AccountPanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.account };
}

export default async function AccountPage() {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/account"), getT()]);
  const personal = ctx.workspaces.find((w) => w.kind === "personal");
  return (
    <>
      <ActivityPing area="settings" organizationId={ctx.workspace.id} />
      <SettingsHeading title={t.settings.sections.account} lead={t.settings.leads.account} />
      <AccountPanel user={ctx.user} personalId={personal?.id ?? null} />
    </>
  );
}
