"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendVaultRelease } from "@/app/actions/vault-admin";
import type { VaultReleaseState } from "@/lib/vault-release";
import { useT } from "@/components/I18nProvider";
import { fmtDateTime, timeAgo } from "@/lib/i18n/format";
import { Button, EmptyState, SettingsWindow } from "@/components/criterio";
import { useConfirm } from "@/components/useConfirm";

/** /admin/vault: the pieces the next "New in the Vault" holds, the button that sends it, and the releases sent */
export default function VaultPanel({ pending, readers, past }: VaultReleaseState) {
  const { locale, t } = useT();
  const v = t.admin.vault;
  const router = useRouter();
  const [confirm, confirmDialog] = useConfirm();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const labelOf = (key: string) => (t.taxonomy.section as Record<string, string>)[key] ?? (t.vault.details as Record<string, string>)[key] ?? key;

  const send = async () => {
    if (!(await confirm({ title: v.sendConfirm(pending.length, readers), action: v.send }))) return;
    setBusy(true); setMsg(null);
    const res = await sendVaultRelease().catch(() => null);
    setMsg(!res?.ok ? { text: res?.error ?? v.failed, error: true } : res.data ? { text: v.sent(res.data.pieces, res.data.sent, res.data.readers) } : { text: v.nothing });
    setBusy(false);
    router.refresh();
  };

  const note = msg
    ? <span className={msg.error ? "cr-field-hint is-error" : undefined} role={msg.error ? "alert" : "status"}>{msg.text}</span>
    : pending.length ? (readers ? v.readers(readers) : v.noReaders) : undefined;
  return (
    <div className="page__body">
      <SettingsWindow title={v.pendingTitle} figure={pending.length || undefined} note={note}
        actions={pending.length ? <Button variant="primary" size="s" onClick={() => void send()} disabled={busy || !readers}>{v.send}</Button> : undefined}>
        {confirmDialog}
        {pending.length === 0 ? <EmptyState title={t.admin.nothingYet}>{v.pendingEmpty}</EmptyState> : (
          <div className="ad-table-wrap">
            <table className="ad-table t-small">
              <thead>
                <tr><th>{v.thPiece}</th><th>{v.thCategory}</th><th className="ad-keep">{v.thPublished}</th></tr>
              </thead>
              <tbody>
                {pending.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <span className="list__main">
                        <span className="list__name t-ui"><a className="list__text" href={`/?in=vault&entry=${encodeURIComponent(e.slug)}`} title={e.title}>{e.title}</a></span>
                        {e.summary && <span className="list__sub t-small">{e.summary}</span>}
                      </span>
                    </td>
                    <td>{labelOf(e.category)}</td>
                    <td className="ad-keep">{timeAgo(e.createdAt, locale, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsWindow>

      <SettingsWindow title={v.pastTitle} figure={past.length || undefined}>
        {past.length === 0 ? <EmptyState title={t.admin.nothingYet}>{v.pastEmpty}</EmptyState> : (
          <div className="ad-table-wrap">
            <table className="ad-table t-small">
              <thead>
                <tr><th>{v.thWhen}</th><th>{v.thBy}</th><th className="ad-keep">{v.thPieces}</th></tr>
              </thead>
              <tbody>
                {past.map((r) => (
                  <tr key={r.id}>
                    <td>{fmtDateTime(r.sentAt, locale)}</td>
                    <td>{r.by}</td>
                    <td className="ad-keep">{r.pieces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SettingsWindow>
    </div>
  );
}
