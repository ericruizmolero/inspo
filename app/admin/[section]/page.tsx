import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getSession } from "@/lib/workspace";
import { activityOverview, listAdmins } from "@/lib/activity";
import { usageOverview } from "@/lib/usage";
import { feedbackOverview } from "@/lib/feedback";
import { getT } from "@/lib/i18n";
import AdminPanel, { type AdminSection } from "../AdminPanel";
import UpdatedAt from "../UpdatedAt";

const SECTIONS: AdminSection[] = ["overview", "usage", "people", "feedback", "access"];
const DAYS = [7, 30, 90];

type Props = { params: Promise<{ section: string }>; searchParams: Promise<{ dias?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ section }, { t }] = await Promise.all([params, getT()]);
  return { title: t.admin.sections[section as AdminSection] ?? t.admin.title };
}

export default async function AdminSectionPage({ params, searchParams }: Props) {
  const [{ section: raw }, { dias }] = await Promise.all([params, searchParams]);
  const section = raw as AdminSection;
  if (!SECTIONS.includes(section)) notFound();
  const days = DAYS.includes(Number(dias)) ? Number(dias) : 30;
  const [s, { t }] = await Promise.all([getSession(), getT()]);

  // Each section loads only what it shows; the overview data also drives "updated at" and the minute refresh
  const [data, usage, feedback, admins] = await Promise.all([
    activityOverview(days),
    section === "usage" ? usageOverview(days) : undefined,
    section === "feedback" ? feedbackOverview(days) : undefined,
    section === "access" ? listAdmins() : undefined,
  ]);

  const lead = section === "overview" ? t.admin.headSub(days) : section === "access" ? t.admin.leads.access : t.admin.leads[section](days);
  const period = section !== "access" && (
    <>
      <nav className="seg" aria-label={t.admin.period}>
        {DAYS.map((d) => (
          <Link key={d} href={`/admin/${section}?dias=${d}`} aria-current={d === days ? "page" : undefined} className={`seg__item${d === days ? " is-active" : ""}`}>
            {t.admin.days(d)}
          </Link>
        ))}
      </nav>
      <UpdatedAt iso={data.generatedAt} />
    </>
  );

  return (
    <>
      <ActivityPing area="admin" />
      <SettingsHeading title={t.admin.sections[section]} lead={lead} aside={period || undefined} />
      <AdminPanel section={section} data={data} usage={usage} feedback={feedback} admins={admins} me={s!.user.email} />
    </>
  );
}
