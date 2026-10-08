"use client";
// Sharing the brand: a link anyone can open, read only, with criterio.md to copy. Each link carries the whole file or
// a clean one for people outside the team. Any member makes one, copies it again, or turns it off.
import { useEffect, useState } from "react";
import { useT } from "../I18nProvider";
import { Dialog, DialogDescription, DialogWindow } from "@/components/ui/dialog";
import { Busy, Button, Chip, Icon, SegmentedControl } from "@/components/criterio";
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
  const modes = ["clean", "full"] as const;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow className="bshare" bar={s.open} heading={s.title} closeLabel={t.common.close}>
        <div className="bshare__body">
          <DialogDescription className="bimp__lead">{s.lead}</DialogDescription>
          <div className="bshare__modes">
            <span className="bshare__legend">{s.mode}</span>
            <SegmentedControl tone="paper" choice label={s.mode} active={modes.indexOf(mode)} onChange={(i) => setMode(modes[i])}
              items={modes.map((m) => ({ label: s[m] }))} />
            <p className="bimp__hint">{mode === "clean" ? s.cleanHint : s.fullHint}</p>
          </div>
          <form className="bshare__make" onSubmit={(e) => { e.preventDefault(); void make(); }}>
            <input className="cr-input" value={label} maxLength={80} placeholder={s.labelPlaceholder} aria-label={s.label} onChange={(e) => setLabel(e.currentTarget.value)} />
            <Button variant="primary" type="submit" disabled={busy}>{busy ? <Busy label={s.make} /> : s.make}</Button>
          </form>
          {links === null ? <p className="bimp__hint"><Busy /></p> : links.length === 0 ? <p className="bimp__hint">{s.none}</p> : (
            <ul className="bshare__list">
              {links.map((l) => (
                <li key={l.id}>
                  <div>
                    <b>{l.label || s.untitled}<Chip tone={l.mode === "full" ? "butter" : "paper"} className="bshare__mode">{s[l.mode]}</Chip></b>
                    <small>{s.made(l.createdBy ?? "?", timeAgo(l.createdAt, locale, t))}, {l.lastViewedAt ? s.viewed(timeAgo(l.lastViewedAt, locale, t)) : s.never}</small>
                    <code>{urlOf(l).replace(/^https?:\/\//, "")}</code>
                  </div>
                  <span>
                    <Button size="s" onClick={() => void copy(l)}>{copied === l.id ? s.copied : s.copyLink}</Button>
                    {/* The system's strong IconButton, size s, as a link */}
                    <a className="cr-iconbtn cr-iconbtn-strong cr-iconbtn-s" href={urlOf(l)} target="_blank" rel="noreferrer" aria-label={s.title} data-tip={s.title}><Icon name="arrow-up-right" size={16} /></a>
                    <Button variant="quiet" size="s" onClick={() => void stop(l)}>{s.revoke}</Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="sysv-error" role="alert">{error}</p>}
        </div>
      </DialogWindow>
    </Dialog>
  );
}
