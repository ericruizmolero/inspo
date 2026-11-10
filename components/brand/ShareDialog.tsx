"use client";
// Sharing the board: a link for the client or the team to comment on the references and choose among them (Eric,
// 10-11). What it shows (the whole board, or the references selected on it when it opened from the selection bar),
// who gets in (anyone with the address, or only people invited by email, each with an address of their own) and how
// much it says (clean, or with who saved each one and their note). Any member makes one, invites more people to it,
// copies it again, or turns it off; each link says what came back through it.
import { useEffect, useState } from "react";
import { useT } from "../I18nProvider";
import { Dialog, DialogDescription, DialogWindow } from "@/components/ui/dialog";
import { Busy, Button, Chip, Icon, SegmentedControl } from "@/components/criterio";
import PersonAvatar from "../PersonAvatar";
import { inviteMore, loadShares, makeShare, stopShare, uninvite } from "@/app/actions/share";
import { timeAgo } from "@/lib/i18n/format";
import type { ShareAccess, ShareLink } from "@/lib/share";
// Its styles (.bshare, .bimp__lead, .bimp__hint) live with the brand's: imported here too, since the dialog also
// opens from a project tab's menu on the board, where the brand page never loaded them
import "./brand.css";

const splitEmails = (text: string) => text.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean);

export default function ShareDialog({ projectId, itemIds, onClose }: {
  projectId: string;
  /** The references selected on the board, when it opened from the selection bar */
  itemIds?: string[];
  onClose: () => void;
}) {
  const { t, locale } = useT();
  const s = t.brand.share;
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [some, setSome] = useState(!!itemIds?.length);
  const [access, setAccess] = useState<ShareAccess>("link");
  const [emails, setEmails] = useState("");
  const [mode, setMode] = useState<"clean" | "full">("clean");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { void loadShares(projectId).then((r) => { if (r.ok) setLinks(r.data); else setError(r.error); }); }, [projectId]);
  const urlOf = (token: string) => `${window.location.origin}/s/${token}`;
  const copy = async (id: string, token: string) => { try { await navigator.clipboard.writeText(urlOf(token)); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* the link is on screen */ } };
  const make = async () => {
    setBusy(true); setError("");
    const r = await makeShare(projectId, { mode, access, label, itemIds: some && itemIds?.length ? itemIds : null, emails: access === "invite" ? splitEmails(emails) : [] });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setLinks(r.data); setLabel(""); setEmails("");
    if (r.data[0]?.access === "link") void copy(r.data[0].id, r.data[0].token);
  };
  const stop = async (l: ShareLink) => { const r = await stopShare(projectId, l.id); if (r.ok) setLinks(r.data); else setError(r.error); };
  const modes = ["clean", "full"] as const;
  const accesses = ["link", "invite"] as const;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow className="bshare" heading={s.title} closeLabel={t.common.close}>
        <div className="bshare__body">
          <DialogDescription className="bimp__lead">{s.lead}</DialogDescription>
          <div className="bshare__modes">
            <span className="bshare__legend">{s.what}</span>
            {/* What goes is chosen on the board, where the references can be seen: select them and press Share in the
                selection bar (Eric, 10-11: "que el propio seleccionar... ya te salga un botón de compartir") */}
            {itemIds?.length ? (
              <SegmentedControl tone="paper" choice label={s.what} active={some ? 1 : 0} onChange={(i) => setSome(i === 1)}
                items={[{ label: s.all }, { label: s.picked(itemIds.length) }]} />
            ) : <p className="bimp__hint">{s.all}. {s.someHint}</p>}
          </div>
          <div className="bshare__modes">
            <span className="bshare__legend">{s.who}</span>
            <SegmentedControl tone="paper" choice label={s.who} active={accesses.indexOf(access)} onChange={(i) => setAccess(accesses[i])}
              items={accesses.map((a) => ({ label: s[a] }))} />
            <p className="bimp__hint">{access === "link" ? s.linkHint : s.inviteHint}</p>
            {access === "invite" && (
              <textarea className="cr-input bshare__emails" rows={2} value={emails} aria-label={s.emails} placeholder={s.emailsPlaceholder}
                onChange={(e) => setEmails(e.currentTarget.value)} />
            )}
          </div>
          <div className="bshare__modes">
            <span className="bshare__legend">{s.mode}</span>
            <SegmentedControl tone="paper" choice label={s.mode} active={modes.indexOf(mode)} onChange={(i) => setMode(modes[i])}
              items={modes.map((m) => ({ label: s[m] }))} />
            <p className="bimp__hint">{mode === "clean" ? s.cleanHint : s.fullHint}</p>
          </div>
          <form className="bshare__make" onSubmit={(e) => { e.preventDefault(); void make(); }}>
            <input className="cr-input" value={label} maxLength={80} placeholder={s.labelPlaceholder} aria-label={s.label} onChange={(e) => setLabel(e.currentTarget.value)} />
            <Button variant="primary" type="submit" disabled={busy || (access === "invite" && !splitEmails(emails).length)}>
              {busy ? <Busy label={s.make} /> : access === "invite" ? s.makeInvite : s.make}
            </Button>
          </form>
          {links === null ? <p className="bimp__hint"><Busy /></p> : links.length === 0 ? <p className="bimp__hint">{s.none}</p> : (
            <ul className="bshare__list">
              {links.map((l) => (
                <li key={l.id}>
                  <div className="bshare__row">
                    <div>
                      <b>
                        {l.label || s.untitled}
                        <Chip tone={l.mode === "full" ? "butter" : "paper"} className="bshare__mode">{s[l.mode]}</Chip>
                        <Chip tone="paper" className="bshare__mode">{l.itemIds ? s.refs(l.itemIds.length) : s.whole}</Chip>
                      </b>
                      <small>
                        {s.made(l.createdBy ?? "?", timeAgo(l.createdAt, locale, t))}, {l.lastViewedAt ? s.viewed(timeAgo(l.lastViewedAt, locale, t)) : s.never}
                        {(l.comments > 0 || l.picks > 0) && <>. <span className="bshare__back">{s.back(l.comments, l.picks)}</span></>}
                      </small>
                      {l.access === "link" && <code>{urlOf(l.token).replace(/^https?:\/\//, "")}</code>}
                    </div>
                    <span>
                      {l.access === "link" && <>
                        <Button size="s" onClick={() => void copy(l.id, l.token)}>{copied === l.id ? s.copied : s.copyLink}</Button>
                        {/* The system's strong IconButton, size s, as a link */}
                        <a className="cr-iconbtn cr-iconbtn-strong cr-iconbtn-s" href={urlOf(l.token)} target="_blank" rel="noreferrer" aria-label={s.title} data-tip={s.title}><Icon name="arrow-up-right" size={16} /></a>
                      </>}
                      <Button variant="quiet" size="s" onClick={() => void stop(l)}>{s.revoke}</Button>
                    </span>
                  </div>
                  {l.access === "invite" && (
                    <Guests link={l} copied={copied} onCopy={(id, token) => void copy(id, token)}
                      onRemove={async (guestId) => { const r = await uninvite(projectId, guestId); if (r.ok) setLinks(r.data); else setError(r.error); }}
                      onInvite={async (list) => { const r = await inviteMore(projectId, l.id, list); if (r.ok) setLinks(r.data); else setError(r.error); return r.ok; }} />
                  )}
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

/** The people invited to a link: each with their own address to copy again, or to take away; and a field for more */
function Guests({ link, copied, onCopy, onRemove, onInvite }: {
  link: ShareLink; copied: string | null;
  onCopy: (id: string, token: string) => void;
  onRemove: (guestId: string) => Promise<void>;
  onInvite: (emails: string[]) => Promise<boolean>;
}) {
  const { t, locale } = useT();
  const s = t.brand.share;
  const [more, setMore] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="bshare__guests">
      {link.guests.map((g) => (
        <div key={g.id} className="bshare__guest">
          <PersonAvatar name={g.name} image={null} size={20} />
          <span className="bshare__guest-who"><b>{g.name}</b> <small>{g.email}{g.lastSeenAt ? `, ${s.viewed(timeAgo(g.lastSeenAt, locale, t))}` : ""}</small></span>
          <Button variant="quiet" size="s" onClick={() => onCopy(g.id, g.token)}>{copied === g.id ? s.copied : s.copyTheirs}</Button>
          <Button variant="quiet" size="s" onClick={() => void onRemove(g.id)}>{s.uninvite}</Button>
        </div>
      ))}
      <form className="bshare__make" onSubmit={async (e) => {
        e.preventDefault();
        const list = splitEmails(more);
        if (!list.length) return;
        setBusy(true);
        if (await onInvite(list)) setMore("");
        setBusy(false);
      }}>
        <input className="cr-input" value={more} aria-label={s.emails} placeholder={s.emailsPlaceholder} onChange={(e) => setMore(e.currentTarget.value)} />
        <Button size="s" type="submit" disabled={busy || !splitEmails(more).length}>{busy ? <Busy label={s.inviteMore} /> : s.inviteMore}</Button>
      </form>
    </div>
  );
}
