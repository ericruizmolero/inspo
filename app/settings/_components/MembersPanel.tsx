"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { UserAvatar } from "@/components/WorkspaceMenu";
import CreateTeamDialog from "@/components/CreateTeamDialog";
import { useT } from "@/components/I18nProvider";
import { fmtDate } from "@/lib/i18n/format";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/useConfirm";

interface Member { id: string; userId: string; name: string; email: string; image?: string | null; role: string; createdAt: string }
interface Invitation { id: string; email: string; role: string | null; expiresAt: string }
interface OverCapacity { members: number; limit: number; planName: string }

export default function MembersPanel({ workspace, me, canManage, members, invitations, seatLimit, overCapacity, startCreating }: {
  workspace: Workspace; me: SessionUser; canManage: boolean; members: Member[]; invitations: Invitation[];
  seatLimit?: number | null; overCapacity?: OverCapacity | null; startCreating: boolean;
}) {
  const { locale, t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const [creating, setCreating] = useState(startCreating);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [lastLink, setLastLink] = useState("");
  const [copied, setCopied] = useState("");

  // El enlace vale por sí solo: si el correo tarda, se pega por chat y la persona entra igual
  const linkOf = (id: string) => `${window.location.origin}/invitacion/${id}`;
  const copy = async (link: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(tag); setTimeout(() => setCopied(""), 2000);
    } catch { setError(t.team.copyFailed(link)); }
  };

  const send = async (value: string, as: "member" | "admin") => {
    setBusy(true); setError(""); setMsg(""); setLastLink("");
    const { data, error: err } = await authClient.organization.inviteMember({ email: value, role: as, organizationId: workspace.id });
    setBusy(false);
    if (err) { setError(err.message ?? t.team.inviteFailed); return; }
    setMsg(t.team.inviteSent(value));
    if (data?.id) setLastLink(linkOf(data.id));
    router.refresh();
  };

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) return;
    await send(value, role);
    setEmail("");
  };

  // Reenviar = invitar otra vez: cancelPendingInvitationsOnReInvite cancela la anterior
  // y crea una nueva con enlace nuevo. No ocupa una plaza de más.
  const resend = (i: Invitation) => send(i.email, (i.role === "admin" ? "admin" : "member"));

  const cancelInvite = async (id: string) => {
    setBusy(true); setError("");
    const { error: err } = await authClient.organization.cancelInvitation({ invitationId: id });
    setBusy(false);
    if (err) { setError(err.message ?? t.team.cancelFailed); return; }
    router.refresh();
  };

  const removeMember = async (m: Member) => {
    if (!(await confirm({ title: t.team.removeConfirm(m.name), action: t.team.remove, danger: true }))) return;
    setBusy(true);
    const { error: err } = await authClient.organization.removeMember({ memberIdOrEmail: m.id, organizationId: workspace.id });
    setBusy(false);
    if (err) setError(err.message ?? t.team.removeFailed); else router.refresh();
  };

  return (
    <div className="page__body">
      {confirmDialog}
      {error && <p className="modal__error">{error}</p>}
      {msg && (
        <p className="page__ok">
          {msg}
          {lastLink && <> · <Button variant="ghost" size="sm" onClick={() => copy(lastLink, "ultimo")}>{copied === "ultimo" ? t.team.linkCopied : t.team.copyLink}</Button></>}
        </p>
      )}

      {workspace.kind !== "team" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.noTeamTitle}</CardTitle>
            <CardDescription>{t.settings.noTeamHint}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="primary" size="sm" onClick={() => setCreating(true)}>{t.ws.createTeam}</Button>
          </CardFooter>
        </Card>
      )}

      {workspace.kind === "team" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.team.members}</CardTitle>
            <CardDescription>
              {seatLimit == null ? members.length : t.team.membersOf(members.length, seatLimit)}
              {invitations.length > 0 && t.team.pendingCount(invitations.length)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overCapacity && (
              <p className="modal__error">
                {t.team.overSeatsBefore(overCapacity.members, overCapacity.planName, overCapacity.limit)}
                <Link href="/settings/plan">{t.team.overSeatsLink}</Link>.
              </p>
            )}
            <ul className="list">
              {members.map((m) => (
                <li key={m.id} className="list__row">
                  <UserAvatar name={m.name} image={m.image} />
                  <span className="list__main">
                    <span className="list__name">{m.name}{m.userId === me.id && <span className="list__you">{t.team.you}</span>}</span>
                    <span className="list__sub">{m.email}</span>
                  </span>
                  <span className="list__role">{t.team.roles[m.role.split(",")[0] as keyof typeof t.team.roles] ?? m.role}</span>
                  {canManage && m.userId !== me.id && (
                    <Button variant="ghost" size="sm" onClick={() => removeMember(m)} disabled={busy}>{t.team.remove}</Button>
                  )}
                </li>
              ))}
            </ul>

            {canManage && (
              <form onSubmit={invite} className="invite">
                <Input type="email" aria-label={t.team.emailPlaceholder} placeholder={t.team.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} required />
                <select className="input invite__role" aria-label={t.team.roles.member} value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
                  <option value="member">{t.team.roles.member}</option>
                  <option value="admin">{t.team.roles.admin}</option>
                </select>
                <Button variant="primary" type="submit" disabled={busy || !email.trim()}>{t.team.invite}</Button>
              </form>
            )}

            {invitations.length > 0 && (
              <>
                <Separator className="my-4" />
                <h3 className="card-subhead">{t.team.pendingInvitations}</h3>
                <p className="card-note">{t.team.pendingHint}</p>
                <ul className="list">
                  {invitations.map((i) => (
                    <li key={i.id} className="list__row">
                      <span className="list__main">
                        <span className="list__name">{i.email}</span>
                        <span className="list__sub">{t.team.roles[(i.role ?? "member") as keyof typeof t.team.roles] ?? i.role} · {t.team.expires(fmtDate(i.expiresAt, locale, { day: "numeric", month: "short", year: "numeric" }))}</span>
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => copy(linkOf(i.id), i.id)} disabled={busy}>
                        {copied === i.id ? t.common.copied : t.team.copyLink}
                      </Button>
                      {canManage && <Button variant="ghost" size="sm" onClick={() => resend(i)} disabled={busy}>{t.team.resend}</Button>}
                      {canManage && <Button variant="ghost" size="sm" onClick={() => cancelInvite(i.id)} disabled={busy}>{t.common.cancel}</Button>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <CreateTeamDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
