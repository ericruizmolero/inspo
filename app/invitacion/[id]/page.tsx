import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/workspace";
import AcceptInvitation from "./AcceptInvitation";

export const metadata: Metadata = { title: "Invitación" };
export const dynamic = "force-dynamic";

export default async function InvitacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(`/invitacion/${id}`)}`);

  const [inv] = await db
    .select({ id: schema.invitation.id, email: schema.invitation.email, status: schema.invitation.status, expiresAt: schema.invitation.expiresAt, orgName: schema.organization.name })
    .from(schema.invitation)
    .innerJoin(schema.organization, eq(schema.invitation.organizationId, schema.organization.id))
    .where(eq(schema.invitation.id, id)).limit(1);

  const problem = !inv ? "Esta invitación no existe."
    : inv.status !== "pending" ? "Esta invitación ya se ha usado o se canceló."
    : +inv.expiresAt < Date.now() ? "Esta invitación ha caducado."
    : inv.email.toLowerCase() !== session.user.email.toLowerCase()
      ? `La invitación es para ${inv.email}, pero has entrado como ${session.user.email}.`
      : null;

  return (
    <div className="auth">
      <div className="auth__card">
        <div className="auth__brand">
          <span className="display auth__title">Inspo</span>
        </div>
        {problem ? (
          <div className="auth__sent">
            <p className="auth__lead">No se puede aceptar</p>
            <p className="auth__hint">{problem}</p>
            <Link href="/" className="btn btn--ghost btn--sm">Ir a la app</Link>
          </div>
        ) : (
          <AcceptInvitation id={inv!.id} teamName={inv!.orgName} />
        )}
      </div>
    </div>
  );
}
