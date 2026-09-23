import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import { sidebarOpen } from "@/lib/sidebar-state";
import { getSession } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { getT } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { template: `%s · ${t.admin.title} · criterio.design`, default: t.admin.title } };
}

// Activity panel for the whole app (all people and workspaces).
// Only for those with access (lib/activity.ts: fixed + added from the panel); for everyone else it does not exist (404).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login?next=/admin");
  if (!(await isAdmin(s.user.email))) notFound();
  const { t } = await getT();
  const a = t.admin.sections;
  return (
    <SectionShell
      defaultOpen={await sidebarOpen()}
      title={t.admin.title}
      base="/admin"
      wide
      groups={[
        {
          items: [
            { slug: "overview", label: a.overview, icon: "overview" },
            { slug: "usage", label: a.usage, icon: "usage" },
            { slug: "people", label: a.people, icon: "people" },
            { slug: "feedback", label: a.feedback, icon: "feedback" },
          ],
        },
        { items: [{ slug: "access", label: a.access, icon: "access" }] },
      ]}
    >
      {children}
    </SectionShell>
  );
}
