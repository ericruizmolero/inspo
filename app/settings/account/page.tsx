import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin } from "@/lib/workspace";
import { getT } from "@/lib/i18n";
import { emailPrefs } from "@/lib/notify";
import { isAdmin } from "@/lib/activity";
import { getsReleases } from "@/lib/vault-release";
import { teamsInTheWay } from "@/lib/account-delete";
import AccountPanel from "../_components/AccountPanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.account, description: t.settings.leads.account };
}

export default async function AccountPage() {
  const [ctx, { locale, t }] = await Promise.all([getCtxOrLogin("/settings/account"), getT()]);
  const personal = ctx.workspaces.find((w) => w.kind === "personal");
  const [{ vault, ...emails }, partner, inTheWay] = await Promise.all([emailPrefs(ctx.user.id), isAdmin(ctx.user.email), teamsInTheWay(ctx.user.id)]);
  // The Vault's releases only reach whoever reads the whole Vault: nobody else sees their switch
  const offered = getsReleases(ctx.workspaces.map((w) => w.plan), partner) ? { ...emails, vault } : emails;
  const blockedBy = inTheWay.length ? new Intl.ListFormat(locale, { type: "conjunction" }).format(inTheWay) : null;
  return (
    <>
      <ActivityPing area="settings" organizationId={ctx.workspace.id} />
      <SettingsHeading title={t.settings.sections.account} lead={t.settings.leads.account} />
      <AccountPanel user={ctx.user} personal={personal ?? null} emails={offered} blockedBy={blockedBy} />
    </>
  );
}
