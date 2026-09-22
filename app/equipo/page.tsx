import type { Metadata } from "next";
import BackLink from "@/components/BackLink";
import ActivityPing from "@/components/ActivityPing";
import { redirect } from "next/navigation";
import { getCtx, HttpError, listMembers, canManage } from "@/lib/workspace";
import { db, schema } from "@/lib/db";
import { and, eq, gt } from "drizzle-orm";
import TeamPanel from "./TeamPanel";
import { usageSummary } from "@/lib/usage";
import { listExtKeys } from "@/lib/ext-keys";
import { overCapacity } from "@/lib/quota";
import { planOf } from "@/lib/plans";

export const metadata: Metadata = { title: "Equipo" };
export const dynamic = "force-dynamic";

export default async function EquipoPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { nuevo } = await searchParams;
  let ctx;
  try { ctx = await getCtx(); } catch (e) { if (e instanceof HttpError) redirect("/login"); throw e; }

  const ws = ctx.workspace;
  const [members, invitations, usage, extKeys, over] = await Promise.all([
    listMembers(ws.id),
    // Las caducadas no se enseñan ni ocupan plaza
    db.select({ id: schema.invitation.id, email: schema.invitation.email, role: schema.invitation.role, expiresAt: schema.invitation.expiresAt })
      .from(schema.invitation)
      .where(and(eq(schema.invitation.organizationId, ws.id), eq(schema.invitation.status, "pending"), gt(schema.invitation.expiresAt, new Date()))),
    usageSummary(ws.id, 30),
    listExtKeys(ws.id),
    overCapacity(ws.id, ws.plan),
  ]);

  return (
    <div className="page">
      <ActivityPing area="equipo" organizationId={ws.id} />
      <div className="page__bar">
        <BackLink />
        <span className="display page__title">{ws.kind === "team" ? ws.name : "Equipos"}</span>
      </div>
      <TeamPanel
        workspace={ws}
        me={ctx.user}
        canManage={canManage(ws.role)}
        members={members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        invitations={invitations.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
        startCreating={nuevo === "1" || ws.kind !== "team"}
        usage={usage}
        extKeys={extKeys.map((k) => ({ ...k, createdAt: k.createdAt.toISOString(), lastUsedAt: k.lastUsedAt ? k.lastUsedAt.toISOString() : null }))}
        seatLimit={planOf(ws.plan).members}
        overCapacity={over}
      />
    </div>
  );
}
