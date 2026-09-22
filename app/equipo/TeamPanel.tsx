"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import type { Workspace, SessionUser } from "@/lib/workspace-core";
import { UserAvatar } from "@/components/WorkspaceMenu";
import type { UsageSummary } from "@/lib/usage";
import { useT } from "@/components/I18nProvider";
import { fmtDate, fmtUsd } from "@/lib/i18n/format";

interface Member { id: string; userId: string; name: string; email: string; image?: string | null; role: string; createdAt: string }
interface Invitation { id: string; email: string; role: string | null; expiresAt: string }
interface ExtKey { id: string; prefix: string; name: string; userId: string; userName: string; createdAt: string; lastUsedAt: string | null }

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

interface OverCapacity { members: number; limit: number; planName: string }

export default function TeamPanel({ workspace, me, canManage, members, invitations, startCreating, usage, extKeys = [], seatLimit, overCapacity }: {
  workspace: Workspace; me: SessionUser; canManage: boolean; members: Member[]; invitations: Invitation[]; startCreating: boolean; usage?: UsageSummary; extKeys?: ExtKey[];
  seatLimit?: number | null; overCapacity?: OverCapacity | null;
}) {
  const { locale, t } = useT();
  const usd = (n: number) => fmtUsd(n, locale);
  const router = useRouter();
  const [creating, setCreating] = useState(startCreating);
  const [teamName, setTeamName] = useState("");
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

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = teamName.trim();
    if (!name) return;
    setBusy(true); setError("");
    const slug = `${slugify(name) || "equipo"}-${Math.random().toString(36).slice(2, 6)}`;
    const { error: err } = await authClient.organization.create({ name, slug });
    setBusy(false);
    if (err) { setError(err.message ?? t.team.createFailed); return; }
    setCreating(false); setTeamName("");
    router.push("/equipo"); router.refresh();
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
    if (!confirm(t.team.removeConfirm(m.name))) return;
    setBusy(true);
    const { error: err } = await authClient.organization.removeMember({ memberIdOrEmail: m.id, organizationId: workspace.id });
    setBusy(false);
    if (err) setError(err.message ?? t.team.removeFailed); else router.refresh();
  };

  const revokeKey = async (k: ExtKey) => {
    if (!confirm(t.team.revokeConfirm(k.name || k.prefix))) return;
    setBusy(true); setError("");
    const res = await fetch(`/api/ext/v1/keys?id=${encodeURIComponent(k.id)}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? t.team.revokeFailed); return; }
    router.refresh();
  };

  const leave = async () => {
    if (!confirm(t.team.leaveConfirm(workspace.name))) return;
    setBusy(true);
    const { error: err } = await authClient.organization.leave({ organizationId: workspace.id });
    setBusy(false);
    if (err) { setError(err.message ?? t.team.leaveFailed); return; }
    router.push("/"); router.refresh();
  };

  return (
    <div className="page__body">
      {error && <p className="modal__error">{error}</p>}
      {msg && (
        <p className="page__ok">
          {msg}
          {lastLink && <> · <button type="button" className="btn btn--ghost btn--sm" onClick={() => copy(lastLink, "ultimo")}>{copied === "ultimo" ? t.team.linkCopied : t.team.copyLink}</button></>}
        </p>
      )}

      {usage && (
        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">{t.team.aiUsage}</span>
            <span className="panel__meta">{t.team.lastDays(usage.sinceDays)}</span>
            <span className="panel__meta" style={{ marginLeft: "auto", color: "var(--text)" }}>{usd(usage.totalUsd)}</span>
          </div>
          {usage.byAction.length === 0 ? (
            <p className="panel__hint">{t.team.noCalls}</p>
          ) : (
            <>
              <ul className="list">
                {usage.byAction.map((a) => (
                  <li key={a.action} className="list__row">
                    <span className="list__main">
                      <span className="list__name">{t.labels.action[a.action as keyof typeof t.labels.action] ?? a.action}</span>
                      <span className="list__sub">{a.action.startsWith("jev_") && a.units ? t.team.itemsInCalls(a.units, a.calls) : t.team.calls(a.calls)}</span>
                    </span>
                    <span className="list__role">{usd(a.usd)}</span>
                  </li>
                ))}
              </ul>
              {usage.byUser.length > 1 && (
                <>
                  <div className="panel__head" style={{ marginTop: 12 }}><span className="panel__title">{t.team.perPerson}</span></div>
                  <ul className="list">
                    {usage.byUser.map((u) => (
                      <li key={u.userId ?? "sys"} className="list__row">
                        <UserAvatar name={u.name ?? t.team.system} image={members.find((m) => m.userId === u.userId)?.image} small />
                        <span className="list__main"><span className="list__name">{u.name ?? t.team.system}</span><span className="list__sub">{t.team.calls(u.calls)}</span></span>
                        <span className="list__role">{usd(u.usd)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <p className="panel__hint">{t.team.costNote}</p>
            </>
          )}
        </section>
      )}

      {workspace.kind === "team" && (
        <section className="panel">
          <div className="panel__head">
            <span className="panel__title">{t.team.members}</span>
            <span className="panel__meta">
              {seatLimit == null ? members.length : t.team.membersOf(members.length, seatLimit)}
              {invitations.length > 0 && t.team.pendingCount(invitations.length)}
            </span>
          </div>
          {overCapacity && (
            <p className="modal__error">
              {t.team.overSeatsBefore(overCapacity.members, overCapacity.planName, overCapacity.limit)}
              <Link href="/planes">{t.team.overSeatsLink}</Link>.
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
                  <button className="btn btn--ghost btn--sm" onClick={() => removeMember(m)} disabled={busy}>{t.team.remove}</button>
                )}
              </li>
            ))}
          </ul>

          {canManage && (
            <form onSubmit={invite} className="invite">
              <input className="input" type="email" placeholder={t.team.emailPlaceholder} value={email} onChange={(e) => setEmail(e.target.value)} required />
              <select className="input invite__role" value={role} onChange={(e) => setRole(e.target.value as "member" | "admin")}>
                <option value="member">{t.team.roles.member}</option>
                <option value="admin">{t.team.roles.admin}</option>
              </select>
              <button className="btn btn--primary" type="submit" disabled={busy || !email.trim()}>{t.team.invite}</button>
            </form>
          )}

          {invitations.length > 0 && (
            <>
              <div className="panel__head" style={{ marginTop: 16 }}>
                <span className="panel__title">{t.team.pendingInvitations}</span>
              </div>
              <p className="panel__hint">{t.team.pendingHint}</p>
              <ul className="list">
                {invitations.map((i) => (
                  <li key={i.id} className="list__row">
                    <span className="list__main">
                      <span className="list__name">{i.email}</span>
                      <span className="list__sub">{t.team.roles[(i.role ?? "member") as keyof typeof t.team.roles] ?? i.role} · {t.team.expires(fmtDate(i.expiresAt, locale, { day: "numeric", month: "short", year: "numeric" }))}</span>
                    </span>
                    <button className="btn btn--ghost btn--sm" onClick={() => copy(linkOf(i.id), i.id)} disabled={busy}>
                      {copied === i.id ? t.common.copied : t.team.copyLink}
                    </button>
                    {canManage && <button className="btn btn--ghost btn--sm" onClick={() => resend(i)} disabled={busy}>{t.team.resend}</button>}
                    {canManage && <button className="btn btn--ghost btn--sm" onClick={() => cancelInvite(i.id)} disabled={busy}>{t.common.cancel}</button>}
                  </li>
                ))}
              </ul>
            </>
          )}

          {workspace.role !== "owner" && (
            <button className="btn btn--ghost btn--sm" style={{ marginTop: 16 }} onClick={leave} disabled={busy}>{t.team.leaveTeam}</button>
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">{t.team.extension}</span>
          {extKeys.length > 0 && <span className="panel__meta">{extKeys.length}</span>}
        </div>
        {extKeys.length > 0 && (
          <ul className="list">
            {extKeys.map((k) => {
              const mine = k.userId === me.id;
              return (
                <li key={k.id} className="list__row">
                  <span className="list__main">
                    <span className="list__name">{k.name || t.team.browser}{mine && <span className="list__you">{t.team.yours}</span>}</span>
                    <span className="list__sub">{k.prefix}… · {k.userName} · {k.lastUsedAt ? t.team.keyUsed(fmtDate(k.lastUsedAt, locale, { day: "numeric", month: "short", year: "numeric" })) : t.team.keyUnused}</span>
                  </span>
                  {(mine || canManage) && <button className="btn btn--ghost btn--sm" onClick={() => revokeKey(k)} disabled={busy}>{t.team.revoke}</button>}
                </li>
              );
            })}
          </ul>
        )}
        <div>
          <a className="btn btn--ghost" href="/extension/conectar">{t.team.connectBrowser}</a>
        </div>
        <p className="panel__hint">{t.team.extensionHint(workspace.name)}</p>
      </section>

      <section className="panel">
        <div className="panel__head">
          <span className="panel__title">{t.team.newTeam}</span>
        </div>
        {creating ? (
          <form onSubmit={createTeam} className="invite">
            <input className="input" autoFocus placeholder={t.team.teamNamePlaceholder} value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
            <button className="btn btn--primary" type="submit" disabled={busy || !teamName.trim()}>{t.team.create}</button>
            {workspace.kind === "team" && <button className="btn btn--ghost" type="button" onClick={() => setCreating(false)}>{t.common.cancel}</button>}
          </form>
        ) : (
          <button className="btn btn--ghost" onClick={() => setCreating(true)}>{t.team.createTeam}</button>
        )}
        <p className="panel__hint">{t.team.newTeamHint}</p>
      </section>
    </div>
  );
}
