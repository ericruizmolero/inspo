import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getSession } from "@/lib/workspace";
import { activityOverview, listAdmins, isAdmin } from "@/lib/activity";
import { usageOverview } from "@/lib/usage";
import { feedbackOverview } from "@/lib/feedback";
import { listFailures } from "@/lib/log";
import { getT, type Dict } from "@/lib/i18n";
import { INVITES_PER_PERSON, signupModeState } from "@/lib/access";
import { listTeamInvites, listWaitlist, waveMetrics } from "@/lib/waves";
import AdminPanel, { type AdminSection } from "../AdminPanel";
import WaitlistPanel from "../WaitlistPanel";
import UpdatedAt from "../UpdatedAt";
import PeriodSwitch from "../PeriodSwitch";

const SECTIONS: AdminSection[] = ["overview", "usage", "people", "feedback", "failures", "access", "waitlist"];
const DAYS = [7, 30, 90];

// Opening a wave mails up to 50 people 600 ms apart, inside a server action that runs under this route
export const maxDuration = 120;

type Props = { params: Promise<{ section: string }>; searchParams: Promise<{ dias?: string }> };

const daysOf = (dias: string | undefined) => (DAYS.includes(Number(dias)) ? Number(dias) : 30);

function leadOf(t: Dict, section: AdminSection, days: number): string {
  if (section === "overview") return t.admin.headSub(days);
  if (section === "access" || section === "waitlist") return t.admin.leads[section];
  return t.admin.leads[section](days);
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ section }, { dias }, { t }] = await Promise.all([params, searchParams, getT()]);
  if (!SECTIONS.includes(section as AdminSection)) return { title: t.admin.title };
  return { title: t.admin.sections[section as AdminSection], description: leadOf(t, section as AdminSection, daysOf(dias)) };
}

export default async function AdminSectionPage({ params, searchParams }: Props) {
  const [{ section: raw }, { dias }] = await Promise.all([params, searchParams]);
  const section = raw as AdminSection;
  if (!SECTIONS.includes(section)) notFound();
  const days = daysOf(dias);
  const [s, { t }] = await Promise.all([getSession(), getT()]);
  // Checked here too, not only in the layout: a client navigation can render this page without the layout
  if (!s || !(await isAdmin(s.user.email))) notFound();

  if (section === "waitlist") {
    const [waitlist, invites, waves] = await Promise.all([listWaitlist(), listTeamInvites(), waveMetrics()]);
    return (
      <>
        <ActivityPing area="admin" />
        <SettingsHeading title={t.admin.sections.waitlist} lead={leadOf(t, section, days)} />
        <WaitlistPanel waitlist={waitlist} invites={invites} waves={waves} />
      </>
    );
  }

  // Each section loads only what it shows; the overview data also drives "updated at" and the minute refresh
  const [data, usage, feedback, failures, admins, signup] = await Promise.all([
    activityOverview(days),
    section === "usage" ? usageOverview(days) : undefined,
    section === "feedback" ? feedbackOverview(days) : undefined,
    section === "failures" ? listFailures(days) : undefined,
    section === "access" ? listAdmins() : undefined,
    section === "access" ? signupModeState() : undefined,
  ]);

  const lead = leadOf(t, section, days);
  const period = section !== "access" && (
    <>
      <PeriodSwitch section={section} days={days} options={DAYS} labels={DAYS.map((d) => t.admin.days(d))} label={t.admin.period} />
      <UpdatedAt iso={data.generatedAt} />
    </>
  );

  return (
    <>
      <ActivityPing area="admin" />
      <SettingsHeading title={t.admin.sections[section]} lead={lead} aside={period || undefined} />
      <AdminPanel section={section} data={data} usage={usage} feedback={feedback} failures={failures} admins={admins} signup={signup}
        invitesPerPerson={section === "access" ? INVITES_PER_PERSON : undefined} me={s!.user.email} />
    </>
  );
}
