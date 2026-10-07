import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import { getSession } from "@/lib/workspace";
import { isAdmin } from "@/lib/activity";
import { getT } from "@/lib/i18n";
import { DS_GROUPS, pageTitles } from "@/lib/design-system";
import "@/components/design-library/DesignLibrary.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: { template: `%s · ${t.designLibrary.title} · criterio.design`, default: t.designLibrary.title } };
}

// The team's own design system (docs/design-system/), shown as pages. Internal: the same people who
// can open /admin (lib/activity.ts); for everyone else it does not exist (404).
// The pages and their names come from the Markdown itself, which is written in Spanish only.
export default async function DesignLibraryLayout({ children }: { children: ReactNode }) {
  const s = await getSession();
  if (!s) redirect("/login?next=/library");
  if (!(await isAdmin(s.user.email))) notFound();
  const [{ t }, titles] = await Promise.all([getT(), pageTitles()]);
  return (
    <SectionShell
      title={t.designLibrary.title}
      base="/library"
      wide
      groups={DS_GROUPS.map((g) => ({
        label: g.label,
        items: g.pages.map((p) => ({ slug: p.slug, label: titles[p.slug], icon: p.icon })),
      }))}
    >
      {children}
    </SectionShell>
  );
}
