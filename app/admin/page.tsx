import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { getSession } from "@/lib/workspace";
import { activityOverview, isAdmin, listAdmins } from "@/lib/activity";
import { usageOverview } from "@/lib/usage";
import { feedbackOverview } from "@/lib/feedback";
import AdminPanel from "./AdminPanel";
import UpdatedAt from "./UpdatedAt";

export const metadata: Metadata = { title: "Actividad" };
export const dynamic = "force-dynamic";

const DAYS = [7, 30, 90];

// Panel de actividad de toda la app (todas las personas y workspaces).
// Solo para quien tenga acceso (lib/activity.ts: fijos + añadidos desde el panel); para el resto no existe (404).
export default async function AdminPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login?next=/admin");
  if (!(await isAdmin(s.user.email))) notFound();

  const { dias } = await searchParams;
  const days = DAYS.includes(Number(dias)) ? Number(dias) : 30;
  const [data, usage, feedback, admins] = await Promise.all([activityOverview(days), usageOverview(days), feedbackOverview(days), listAdmins()]);

  return (
    <div className="page page--wide">
      <ActivityPing area="admin" />
      <header className="ad-head">
        <BackLink />
        <div className="ad-head__row">
          <div className="ad-head__text">
            <h1 className="display ad-head__title">Actividad</h1>
            <p className="ad-head__sub">Uso de Inspo por todas las personas y equipos en los últimos {days} días.</p>
          </div>
          <div className="ad-head__tools">
            <nav className="seg" aria-label="Periodo">
              {DAYS.map((d) => (
                <Link key={d} href={`/admin?dias=${d}`} aria-current={d === days ? "page" : undefined} className={`seg__item${d === days ? " is-active" : ""}`}>
                  {d} días
                </Link>
              ))}
            </nav>
            <UpdatedAt iso={data.generatedAt} />
          </div>
        </div>
      </header>
      <AdminPanel data={data} usage={usage} feedback={feedback} admins={admins} me={s.user.email} />
    </div>
  );
}
