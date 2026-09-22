import type { Metadata } from "next";
import type { ReactNode } from "react";
import SectionShell from "@/components/SectionShell";
import { sidebarOpen } from "@/lib/sidebar-state";
import { getCtxOrLogin } from "@/lib/workspace";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { template: `%s · ${t.settings.title} · criterio.design`, default: t.settings.title } };
}

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings"), getT()]);
  const s = t.settings.sections;
  return (
    <SectionShell
      defaultOpen={await sidebarOpen()}
      title={t.settings.title}
      base="/settings"
      groups={[
        { items: [{ slug: "account", label: s.account, icon: "account" }] },
        {
          label: ctx.workspace.name,
          items: [
            { slug: "workspace", label: s.workspace, icon: "workspace" },
            { slug: "members", label: s.members, icon: "members" },
            { slug: "plan", label: s.plan, icon: "plan" },
            { slug: "extension", label: s.extension, icon: "extension" },
          ],
        },
      ]}
    >
      {children}
    </SectionShell>
  );
}
