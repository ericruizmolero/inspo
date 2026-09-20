import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCtx, HttpError, listMembers, canManage } from "@/lib/workspace";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import TeamPanel from "./TeamPanel";

export const metadata: Metadata = { title: "Equipo — Inspo" };
export const dynamic = "force-dynamic";

export default async function EquipoPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  let ctx;
  try { ctx = await getCtx(); } catch (e) { if (e instanceof HttpError) redirect("/login"); throw e; }

  const ws = ctx.workspace;
  const [members, invitations] = await Promise.all([
    listMembers(ws.id),
    db.select({ id: schema.invitation.id, email: schema.invitation.email, role: schema.invitation.role, expiresAt: schema.invitation.expiresAt })
      .from(schema.invitation)
      .where(and(eq(schema.invitation.organizationId, ws.id), eq(schema.invitation.status, "pending"))),
  ]);

  return (
    <div className="page">
      <div className="page__bar">
        <Link href="/" className="btn btn--ghost btn--sm">← Volver</Link>
        <span className="display page__title">{ws.kind === "team" ? ws.name : "Equipos"}</span>
      </div>
      <TeamPanel
        workspace={ws}
        me={ctx.user}
        canManage={canManage(ws.role)}
        members={members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        invitations={invitations.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
        startCreating={nuevo === "1" || ws.kind !== "team"}
      />
    </div>
  );
}
