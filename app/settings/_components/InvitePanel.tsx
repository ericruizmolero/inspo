"use client";
// Settings → Invite: hand out a personal invite, as a link or to an address, and see who came in on yours.
// These give someone their own account; bringing them into a workspace is Members.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";
import { fmtDate } from "@/lib/i18n/format";
import { Button, EmptyState, FieldRow, SettingsWindow } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";
import { createMyInvite, revokeMyInvite } from "@/app/actions/invites";
import type { PersonalInvite } from "@/lib/access";
import { DEFAULT_PLAN } from "@/lib/plans";
import CappedList from "./CappedList";

type Invite = Omit<PersonalInvite, "createdAt"> & { createdAt: string };
interface Made { link: string; email: string | null; mailed: boolean }

export default function InvitePanel({ left, invites }: { left: number; invites: Invite[] }) {
  const { locale, t } = useT();
  const v = t.invites;
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<Made | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(""); setMade(null); setCopied(false);
    const r = await createMyInvite(email.trim() || null).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? v.failed); return; }
    setMade(r.data);
    setEmail("");
    router.refresh();
  };

  const copy = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { setError(t.team.copyFailed(link)); }
  };

  const revoke = async (i: Invite) => {
    if (!(await confirm({ title: v.revokeConfirm, description: v.revokeHint, action: v.revoke }))) return;
    setBusy(true); setError("");
    const r = await revokeMyInvite(i.id).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? v.failed); return; }
    if (made) setMade(null);
    router.refresh();
  };

  const note = error
    ? <span className="cr-field-hint is-error" role="alert">{error}</span>
    : made?.email
      ? <span className="setting-ok" role="status">{made.mailed ? v.sent(made.email) : v.notMailed(made.email)}</span>
      : left === 0 ? v.noneLeft : undefined;
  const date = (iso: string) => fmtDate(iso, locale, { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="page__body">
      {confirmDialog}

      <SettingsWindow title={v.title} figure={v.left(left)} note={note}
        description={<>{v.scope(t.plans.items[DEFAULT_PLAN].name)} <Link href="/settings/members">{v.scopeLink}</Link>{v.scopeAfter}</>}>
        <form onSubmit={create}>
          <FieldRow label={t.team.emailLabel} hint={v.emailHint} htmlFor="access-invite-email"
            action={<Button variant="primary" size="s" type="submit" disabled={busy || left === 0}>{email.trim() ? v.send : v.createLink}</Button>}>
            <input id="access-invite-email" type="email" className="cr-input" placeholder={t.team.emailPlaceholder}
              value={email} onChange={(e) => setEmail(e.target.value)} disabled={left === 0} />
          </FieldRow>
        </form>
        {made && (
          <FieldRow label={v.yourLink} hint={v.shownOnce} htmlFor="access-invite-link"
            action={<Button size="s" onClick={() => copy(made.link)}>{copied ? t.common.copied : t.team.copyLink}</Button>}>
            <input id="access-invite-link" className="cr-input" readOnly value={made.link} onFocus={(e) => e.currentTarget.select()} />
          </FieldRow>
        )}
      </SettingsWindow>

      <SettingsWindow title={v.madeTitle} figure={invites.length || undefined}>
        {invites.length === 0 ? <EmptyState title={v.empty} /> : (
          <CappedList>
            {invites.map((i) => (
              <li key={i.id} className="list__row">
                <span className="list__main">
                  <span className="list__name t-ui"><span className="list__text">{i.joined?.name ?? i.email ?? v.link}</span></span>
                  <span className="list__sub t-small">
                    <span>{i.state === "used" ? (i.joined && i.joined.name !== i.joined.email ? v.joinedAs(i.joined.email) : v.states.used) : v.states[i.state]}</span>
                    <span>{date(i.createdAt)}</span>
                  </span>
                </span>
                {i.state === "pending" && (
                  <Button variant="quiet" size="s" onClick={() => revoke(i)} disabled={busy}>{v.revoke}</Button>
                )}
              </li>
            ))}
          </CappedList>
        )}
      </SettingsWindow>
    </div>
  );
}
