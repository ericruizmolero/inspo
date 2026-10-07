"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import CreateTeamDialog from "@/components/CreateTeamDialog";
import { useT } from "@/components/I18nProvider";
import { fmtDate } from "@/lib/i18n/format";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/useConfirm";
import { Chip, FieldRow, SegmentedControl, SettingsWindow } from "@/components/criterio";
import PersonAvatar from "@/components/PersonAvatar";

const ROLES = ["member", "admin"] as const;

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

  // The link works on its own: if the email is slow, paste it in a chat and the person still gets in
  const linkOf = (id: string) => `${window.location.origin}/invite/${id}`;
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

  // Resend = invite again: cancelPendingInvitationsOnReInvite cancels the previous one
  // and creates a new one with a new link. It does not take an extra seat.
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

  const roleOf = (r: string | null) => t.team.roles[(r ?? "member").split(",")[0] as keyof typeof t.team.roles] ?? r;
  // What the last invitation did, in the window's footer: the error, or the sent line with its link to copy
  const note = error
    ? <span className="cr-field-hint is-error" role="alert">{error}</span>
    : msg
      ? <span className="setting-ok" role="status">{msg}{lastLink && <Button variant="quiet" size="sm" onClick={() => copy(lastLink, "last")}>{copied === "last" ? t.team.linkCopied : t.team.copyLink}</Button>}</span>
      : undefined;

  return (
    <div className="page__body">
      {confirmDialog}

      {workspace.kind !== "team" && (
        <SettingsWindow title={t.settings.noTeamTitle} note={t.settings.noTeamHint}
          actions={<Button variant="primary" onClick={() => setCreating(true)}>{t.ws.createTeam}</Button>} />
      )}

      {workspace.kind === "team" && (
        <SettingsWindow title={t.team.members} figure={seatLimit == null ? members.length : t.team.membersOf(members.length, seatLimit)} note={note}>
          {overCapacity && (
            <p className="cr-field-hint is-error setting-alert">
              {t.team.overSeatsBefore(overCapacity.members, overCapacity.planName, overCapacity.limit)}
              <Link href="/settings/plan">{t.team.overSeatsLink}</Link>.
            </p>
          )}
          <ul className="list">
            {members.map((m) => (
              <li key={m.id} className="list__row">
                <PersonAvatar name={m.name} image={m.image} size={32} />
                <span className="list__main">
                  <span className="list__name t-ui"><span className="list__text">{m.name}</span>{m.userId === me.id && <Chip className="list__you t-label">{t.team.you}</Chip>}</span>
                  <span className="list__sub t-small">{m.email}</span>
                </span>
                <span className="list__meta t-small">{roleOf(m.role)}</span>
                {canManage && m.userId !== me.id && (
                  <Button variant="quiet" size="sm" onClick={() => removeMember(m)} disabled={busy}>{t.team.remove}</Button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <form onSubmit={invite}>
              <FieldRow label={t.team.emailLabel} htmlFor="invite-email"
                action={<Button variant="primary" type="submit" disabled={busy || !email.trim()}>{t.team.invite}</Button>}>
                <span className="setting-invite">
                  <input id="invite-email" type="email" className="cr-input" placeholder={t.team.emailPlaceholder}
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                  <SegmentedControl tone="paper" choice className="theme-seg" label={t.team.role}
                    active={ROLES.indexOf(role)} onChange={(i) => setRole(ROLES[i])}
                    items={ROLES.map((r) => ({ label: t.team.roles[r] }))} />
                </span>
              </FieldRow>
            </form>
          )}
        </SettingsWindow>
      )}

      {workspace.kind === "team" && invitations.length > 0 && (
        <SettingsWindow title={t.team.pendingInvitations} figure={invitations.length} description={t.team.pendingHint}>
          <ul className="list">
            {invitations.map((i) => (
              <li key={i.id} className="list__row">
                <span className="list__main">
                  <span className="list__name t-ui"><span className="list__text">{i.email}</span></span>
                  <span className="list__sub t-small"><span>{roleOf(i.role)}</span><span>{t.team.expires(fmtDate(i.expiresAt, locale, { day: "numeric", month: "short", year: "numeric" }))}</span></span>
                </span>
                <span className="list__actions">
                  <Button variant="quiet" size="sm" onClick={() => copy(linkOf(i.id), i.id)} disabled={busy}>
                    {copied === i.id ? t.common.copied : t.team.copyLink}
                  </Button>
                  {canManage && <Button variant="quiet" size="sm" onClick={() => resend(i)} disabled={busy}>{t.team.resend}</Button>}
                  {canManage && <Button variant="quiet" size="sm" onClick={() => cancelInvite(i.id)} disabled={busy}>{t.common.cancel}</Button>}
                </span>
              </li>
            ))}
          </ul>
        </SettingsWindow>
      )}

      <CreateTeamDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}
