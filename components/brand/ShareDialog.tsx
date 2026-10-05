"use client";
// Sharing the brand: a link anyone can open, read only, with criterio.md to copy. Each link carries the whole file or
// a clean one for people outside the team. Any member makes one, copies it again, or turns it off.
import { useEffect, useState } from "react";
import { useT } from "../I18nProvider";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icons } from "../Sidebar";
import { loadShares, makeShare, stopShare } from "@/app/actions/share";
import { timeAgo } from "@/lib/i18n/format";
import type { ShareLink } from "@/lib/share";

export default function ShareDialog({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t, locale } = useT();
  const s = t.brand.share;
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [mode, setMode] = useState<"clean" | "full">("clean");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { void loadShares(projectId).then((r) => { if (r.ok) setLinks(r.data); else setError(r.error); }); }, [projectId]);
  const urlOf = (l: ShareLink) => `${window.location.origin}/s/${l.token}`;
  const copy = async (l: ShareLink) => { try { await navigator.clipboard.writeText(urlOf(l)); setCopied(l.id); setTimeout(() => setCopied(null), 1500); } catch { /* the link is on screen */ } };
  const make = async () => {
    setBusy(true); setError("");
    const r = await makeShare(projectId, mode, label);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setLinks(r.data); setLabel("");
    if (r.data[0]) void copy(r.data[0]);
  };
  const stop = async (l: ShareLink) => { const r = await stopShare(projectId, l.id); if (r.ok) setLinks(r.data); else setError(r.error); };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bshare">
        <div className="modal__header">
          <DialogTitle>{s.title}</DialogTitle>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>
        <div className="modal__body bshare__body">
          <DialogDescription className="bimp__lead">{s.lead}</DialogDescription>
          <fieldset className="bshare__modes">
            <legend>{s.mode}</legend>
            {(["clean", "full"] as const).map((m) => (
              <label key={m} className={mode === m ? "is-on" : ""}>
                <input type="radio" name="share-mode" value={m} checked={mode === m} onChange={() => setMode(m)} />
                <span><b>{s[m]}</b><small>{m === "clean" ? s.cleanHint : s.fullHint}</small></span>
              </label>
            ))}
          </fieldset>
          <form className="bshare__make" onSubmit={(e) => { e.preventDefault(); void make(); }}>
            <input className="input" value={label} maxLength={80} placeholder={s.labelPlaceholder} aria-label={s.label} onChange={(e) => setLabel(e.currentTarget.value)} />
            <Button variant="primary" size="sm" type="submit" disabled={busy}>{busy ? <span className="spinner spinner--sm" /> : s.make}</Button>
          </form>
          {links === null ? <p className="bimp__hint"><span className="spinner spinner--sm" /></p> : links.length === 0 ? <p className="bimp__hint">{s.none}</p> : (
            <ul className="bshare__list">
              {links.map((l) => (
                <li key={l.id}>
                  <div>
                    <b>{l.label || s.untitled}<em className={`bshare__mode is-${l.mode}`}>{s[l.mode]}</em></b>
                    <small>{s.made(l.createdBy ?? "?", timeAgo(l.createdAt, locale, t))} · {l.lastViewedAt ? s.viewed(timeAgo(l.lastViewedAt, locale, t)) : s.never}</small>
                    <code>{urlOf(l).replace(/^https?:\/\//, "")}</code>
                  </div>
                  <span>
                    <button type="button" onClick={() => void copy(l)}>{copied === l.id ? s.copied : s.copyLink}</button>
                    <a href={urlOf(l)} target="_blank" rel="noreferrer" aria-label={s.title}>↗</a>
                    <button type="button" className="is-danger" onClick={() => void stop(l)}>{s.revoke}</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="sysv-error" role="alert">{error}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
