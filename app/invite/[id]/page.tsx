import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/workspace";
import AcceptInvitation from "./AcceptInvitation";
import SwitchAccount from "./SwitchAccount";
import { getT } from "@/lib/i18n";
import Logo from "@/components/Logo";
import AuthWindow from "@/components/AuthWindow";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.invite.pageTitle };
}

export default async function InvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const path = `/invite/${id}`;
  const session = await getSession();
  const { t } = await getT();
  if (!session) redirect(`/login?next=${encodeURIComponent(path)}`);

  const [inv] = await db
    .select({
      id: schema.invitation.id, email: schema.invitation.email, status: schema.invitation.status, expiresAt: schema.invitation.expiresAt,
      orgName: schema.organization.name, inviterName: schema.user.name, inviterEmail: schema.user.email, inviterImage: schema.user.image,
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
          <Logo size={48} />
        </div>
        {problem ? (
          <AuthWindow
            title={t.invite.pageTitle}
            heading={t.invite.cannotAccept}
            status={t.invite.signedInAs(session.user.email)}
            footer={<>
              <Link href="/" className="cr-btn cr-btn-secondary cr-btn-m">{t.invite.goToApp}</Link>
              {/* A mismatched email was a dead end: now the account can be switched */}
              {mismatch ? <SwitchAccount next={path} /> : null}
            </>}
          >
            <p className="auth__hint">{problem}</p>
            {inv && !mismatch ? (
              <p className="auth__hint">
                {t.invite.askAnother(inv.inviterName || inv.inviterEmail)}{" "}
                <a href={`mailto:${inv.inviterEmail}?subject=${encodeURIComponent(t.invite.mailSubject(inv.orgName))}`}>{inv.inviterEmail}</a>
              </p>
            ) : null}
          </AuthWindow>
        ) : (
          <AcceptInvitation
            id={inv!.id}
            teamName={inv!.orgName}
            inviterName={inv!.inviterName || inv!.inviterEmail}
            inviterEmail={inv!.inviterEmail}
            inviterImage={inv!.inviterImage}
            youAre={session.user.email}
          />
        )}
      </div>
    </div>
  );
}
