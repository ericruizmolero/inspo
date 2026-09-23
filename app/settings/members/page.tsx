import type { Metadata } from "next";
import ActivityPing from "@/components/ActivityPing";
import SettingsHeading from "@/components/SettingsHeading";
import { getCtxOrLogin, listMembers, canManage } from "@/lib/workspace";
import { db, schema } from "@/lib/db";
import { and, eq, gt } from "drizzle-orm";
import { overCapacity } from "@/lib/quota";
import { planOf } from "@/lib/plans";
import { getT } from "@/lib/i18n";
import MembersPanel from "../_components/MembersPanel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t.settings.sections.members };
}

// ?create=1 opens the Create team dialog
export default async function MembersPage({ searchParams }: { searchParams: Promise<{ create?: string }> }) {
  const { create } = await searchParams;
  const [ctx, { t }] = await Promise.all([getCtxOrLogin("/settings/members"), getT()]);
  const ws = ctx.workspace;
  const [members, invitations, over] = await Promise.all([
    listMembers(ws.id),
    // Expired ones are not shown and do not take a seat
    db.select({ id: schema.invitation.id, email: schema.invitation.email, role: schema.invitation.role, expiresAt: schema.invitation.expiresAt })
      .from(schema.invitation)
      .where(and(eq(schema.invitation.organizationId, ws.id), eq(schema.invitation.status, "pending"), gt(schema.invitation.expiresAt, new Date()))),
    overCapacity(ws.id, ws.plan),
  ]);

  return (
    <>
      <ActivityPing area="team" organizationId={ws.id} />
      <SettingsHeading title={t.settings.sections.members} lead={ws.kind === "personal" ? t.settings.leads.personal : t.settings.leads.members(ws.name)} />
      <MembersPanel
        workspace={ws}
        me={ctx.user}
        canManage={canManage(ws.role)}
        members={members.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        invitations={invitations.map((i) => ({ ...i, expiresAt: i.expiresAt.toISOString() }))}
        seatLimit={planOf(ws.plan).members}
        overCapacity={over}
        startCreating={create === "1"}
      />
    </>
  );
}
