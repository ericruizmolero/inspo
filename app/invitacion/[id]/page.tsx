import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/workspace";
import AcceptInvitation from "./AcceptInvitation";
import SwitchAccount from "./SwitchAccount";
import { getT } from "@/lib/i18n";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.invite.pageTitle };
}

export default async function InvitacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/invitacion/${id}`;
  const session = await getSession();
  const { t } = await getT();
  if (!session) redirect(`/login?next=${encodeURIComponent(path)}`);

  const [inv] = await db
    .select({
      id: schema.invitation.id, email: schema.invitation.email, status: schema.invitation.status, expiresAt: schema.invitation.expiresAt,
      orgName: schema.organization.name, inviterName: schema.user.name, inviterEmail: schema.user.email,
    })
    .from(schema.invitation)
    .innerJoin(schema.organization, eq(schema.invitation.organizationId, schema.organization.id))
    .innerJoin(schema.user, eq(schema.invitation.inviterId, schema.user.id))
    .where(eq(schema.invitation.id, id)).limit(1);

  const mismatch = !!inv && inv.email.toLowerCase() !== session.user.email.toLowerCase();
  const problem = !inv ? t.invite.notFound
    : inv.status !== "pending" ? t.invite.used
    : +inv.expiresAt < Date.now() ? t.invite.expired
    : mismatch
      ? t.invite.mismatch(inv.email, session.user.email)
      : null;

  return (
    <div className="auth auth--solo">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="display auth__title">Inspo</span>
        </div>
        {problem ? (
          <div className="auth__sent">
            <p className="auth__lead">{t.invite.cannotAccept}</p>
            <p className="auth__hint">{problem}</p>
            {/* El correo que no coincide era un callejón sin salida: ahora se puede cambiar de cuenta */}
            {mismatch ? <SwitchAccount next={path} /> : null}
            {inv && !mismatch ? (
              <p className="auth__hint">
                {t.invite.askAnother(inv.inviterName || inv.inviterEmail)}{" "}
                <a href={`mailto:${inv.inviterEmail}?subject=${encodeURIComponent(t.invite.mailSubject(inv.orgName))}`}>{inv.inviterEmail}</a>
              </p>
            ) : null}
            <Link href="/" className="btn btn--ghost btn--sm">{t.invite.goToApp}</Link>
          </div>
        ) : (
          <AcceptInvitation
            id={inv!.id}
            teamName={inv!.orgName}
            inviterName={inv!.inviterName || inv!.inviterEmail}
            inviterEmail={inv!.inviterEmail}
            youAre={session.user.email}
          />
        )}
      </div>
    </div>
  );
}
