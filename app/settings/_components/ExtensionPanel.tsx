"use client";

import { revokeKey as revokeKeyAction } from "@/app/actions/ext-keys";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/workspace-core";
import { useT } from "@/components/I18nProvider";
import { fmtDate } from "@/lib/i18n/format";
import { Button, Chip, SettingsWindow } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";

interface ExtKey { id: string; prefix: string; name: string; userId: string; userName: string; createdAt: string; lastUsedAt: string | null }

export default function ExtensionPanel({ me, canManage, extKeys }: { me: SessionUser; canManage: boolean; extKeys: ExtKey[] }) {
  const { locale, t } = useT();
  const [confirm, confirmDialog] = useConfirm();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const revokeKey = async (k: ExtKey) => {
    if (!(await confirm({ title: t.team.revokeConfirm(k.name || k.prefix), action: t.team.revoke, danger: true }))) return;
    setBusy(true); setError("");
    const r = await revokeKeyAction(k.id).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setError(r?.error ?? t.team.revokeFailed); return; }
    router.refresh();
  };

  const hasMine = extKeys.some((k) => k.userId === me.id);

  return (
    <div className="page__body">
      {confirmDialog}
      <SettingsWindow title={t.settings.browsers} description={t.settings.connectHint}
        note={error ? <span className="cr-field-hint is-error" role="alert">{error}</span> : undefined}
        actions={
          <>
            {/* With no browser of theirs connected, the guide (it ends by connecting); after that, connecting another is the common case */}
            <Button variant={hasMine ? "secondary" : "primary"} size="s" href="/extension/install">{t.settings.installExt}</Button>
            <Button variant={hasMine ? "primary" : "secondary"} size="s" href="/extension/connect">{t.team.connectBrowser}</Button>
          </>
        }>
        {extKeys.length > 0 && (
          <ul className="list">
            {extKeys.map((k) => {
              const mine = k.userId === me.id;
              return (
                <li key={k.id} className="list__row">
                  <span className="list__main">
                    <span className="list__name t-ui"><span className="list__text">{k.name || t.team.browser}</span>{mine && <Chip className="list__you t-label">{t.team.yours}</Chip>}</span>
                    <span className="list__sub t-small"><span>{k.prefix}…</span><span>{k.userName}</span><span>{k.lastUsedAt ? t.team.keyUsed(fmtDate(k.lastUsedAt, locale, { day: "numeric", month: "short", year: "numeric" })) : t.team.keyUnused}</span></span>
                  </span>
                  {(mine || canManage) && <Button variant="quiet" size="s" onClick={() => revokeKey(k)} disabled={busy}>{t.team.revoke}</Button>}
                </li>
              );
            })}
          </ul>
        )}
      </SettingsWindow>
    </div>
  );
}
