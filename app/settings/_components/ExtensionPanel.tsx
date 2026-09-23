"use client";

import { revokeKey as revokeKeyAction } from "@/app/actions/ext-keys";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SessionUser } from "@/lib/workspace-core";
import { useT } from "@/components/I18nProvider";
import { fmtDate } from "@/lib/i18n/format";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
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

  return (
    <div className="page__body">
      {confirmDialog}
      {error && <p className="modal__error">{error}</p>}
      <Card>
        <CardHeader>
          <CardTitle>{t.settings.browsers}</CardTitle>
          <CardDescription>{t.settings.connectHint}</CardDescription>
          {extKeys.length > 0 && <CardAction className="card-figure">{extKeys.length}</CardAction>}
        </CardHeader>
        {extKeys.length > 0 && (
          <CardContent>
            <ul className="list">
              {extKeys.map((k) => {
                const mine = k.userId === me.id;
                return (
                  <li key={k.id} className="list__row">
                    <span className="list__main">
                      <span className="list__name">{k.name || t.team.browser}{mine && <span className="list__you">{t.team.yours}</span>}</span>
                      <span className="list__sub">{k.prefix}… · {k.userName} · {k.lastUsedAt ? t.team.keyUsed(fmtDate(k.lastUsedAt, locale, { day: "numeric", month: "short", year: "numeric" })) : t.team.keyUnused}</span>
                    </span>
                    {(mine || canManage) && <Button variant="ghost" size="sm" onClick={() => revokeKey(k)} disabled={busy}>{t.team.revoke}</Button>}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        )}
        <CardFooter>
          <a className={buttonVariants({ variant: "primary", size: "sm" })} href="/extension/connect">{t.team.connectBrowser}</a>
        </CardFooter>
      </Card>
    </div>
  );
}
