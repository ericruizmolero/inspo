"use client";
// Sharing the board: a link for the client or the team to comment on the references and choose among them (Eric,
// 10-11). What it shows (the whole board, or the references selected on it when it opened from the selection bar),
// who gets in (anyone with the address, or only people invited by email, each with an address of their own) and how
// much it says (clean, or with who saved each one and their note). Any member makes one, invites more people to it,
// copies it again, or turns it off; each link says what came back through it.
import { useEffect, useState } from "react";
import { useT } from "../I18nProvider";
import { Dialog, DialogDescription, DialogWindow } from "@/components/ui/dialog";
import { Busy, Button, Icon, IconButton, SegmentedControl } from "@/components/criterio";
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
  const [subtitle, setSubtitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { void loadShares(projectId).then((r) => { if (r.ok) setLinks(r.data); else setError(r.error); }); }, [projectId]);
  const urlOf = (token: string) => `${window.location.origin}/s/${token}`;
  const copy = async (id: string, token: string) => { try { await navigator.clipboard.writeText(urlOf(token)); setCopied(id); setTimeout(() => setCopied(null), 1500); } catch { /* the link is on screen */ } };
  const make = async () => {
    setBusy(true); setError("");
    const r = await makeShare(projectId, { mode, access, label, subtitle, itemIds: some && itemIds?.length ? itemIds : null, emails: access === "invite" ? splitEmails(emails) : [] });
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    setLinks(r.data); setLabel(""); setSubtitle(""); setEmails("");
    if (r.data[0]?.access === "link") void copy(r.data[0].id, r.data[0].token);
  };
  const stop = async (l: ShareLink) => { const r = await stopShare(projectId, l.id); if (r.ok) setLinks(r.data); else setError(r.error); };
  const modes = ["clean", "full"] as const;
  const accesses = ["link", "invite"] as const;
  // One line under the three settings says what the link will be, instead of a hint under each
  const summary = [access === "link" ? s.linkHint : s.inviteHint, mode === "clean" ? s.cleanHint : s.fullHint].join(" ");
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow className="bshare" heading={s.title} closeLabel={t.common.close}>
        <div className="bshare__body">
          <DialogDescription className="bimp__lead">{s.lead}</DialogDescription>
          {/* Each setting on one row: its name, and its choice at size s. What goes is chosen on the board (select, then
              Share in the selection bar): without a selection the row says so in a tooltip */}
          <div className="bshare__sets">
            <div className="bshare__set">
              <span className="bshare__legend">{s.what}</span>
              {itemIds?.length ? (
                <SegmentedControl tone="paper" size="s" choice label={s.what} active={some ? 1 : 0} onChange={(i) => setSome(i === 1)}
                  items={[{ label: s.all }, { label: s.picked(itemIds.length) }]} />
              ) : <span className="bshare__value" data-tip={s.someHint}>{s.all}</span>}
            </div>
            <div className="bshare__set">
              <span className="bshare__legend">{s.who}</span>
              <SegmentedControl tone="paper" size="s" choice label={s.who} active={accesses.indexOf(access)} onChange={(i) => setAccess(accesses[i])}
                items={accesses.map((a) => ({ label: s[a], title: a === "link" ? s.linkHint : s.inviteHint }))} />
            </div>
            <div className="bshare__set">
              <span className="bshare__legend">{s.mode}</span>
              <SegmentedControl tone="paper" size="s" choice label={s.mode} active={modes.indexOf(mode)} onChange={(i) => setMode(modes[i])}
                items={modes.map((m) => ({ label: s[m], title: m === "clean" ? s.cleanHint : s.fullHint }))} />
            </div>
            {access === "invite" && (
              <textarea className="cr-input bshare__emails" rows={1} value={emails} aria-label={s.emails} placeholder={s.emailsPlaceholder}
                onChange={(e) => setEmails(e.currentTarget.value)} />
            )}
            <p className="bimp__hint bshare__summary">{summary}</p>
          </div>
          {/* A line under the project's name on the shared page, if wanted (Eric, 10-11: "dar pie a añadir un subtítulo") */}
          <input className="cr-input" value={subtitle} maxLength={200} placeholder={s.subtitlePlaceholder} aria-label={s.subtitle} onChange={(e) => setSubtitle(e.currentTarget.value)} />
          <form className="bshare__make" onSubmit={(e) => { e.preventDefault(); void make(); }}>
            <input className="cr-input" value={label} maxLength={80} placeholder={s.labelPlaceholder} aria-label={s.label} onChange={(e) => setLabel(e.currentTarget.value)} />
            <Button variant="primary" type="submit" disabled={busy || (access === "invite" && !splitEmails(emails).length)}>
              {busy ? <Busy label={s.make} /> : access === "invite" ? s.makeInvite : s.make}
            </Button>
          </form>
          {links === null ? <p className="bimp__hint"><Busy /></p> : links.length > 0 && (
            <section className="bshare__links" aria-label={s.links}>
              <span className="bshare__legend">{s.links}</span>
              <ul className="bshare__list">
                {links.map((l) => {
                  const meta = [
                    l.itemIds ? s.refs(l.itemIds.length) : s.whole,
                    s[l.mode].toLowerCase(),
                    l.access === "invite" ? s.invite.toLowerCase() : "",
                    l.lastViewedAt ? s.viewed(timeAgo(l.lastViewedAt, locale, t)) : s.never,
                  ].filter(Boolean).join(", ");
                  return (
                    <li key={l.id}>
                      <div className="bshare__row">
                        <div className="bshare__what" title={s.made(l.createdBy ?? "?", timeAgo(l.createdAt, locale, t))}>
                          <b>{l.label || s.untitled}</b>
                          <small>{meta}{(l.comments > 0 || l.picks > 0) && <>. <span className="bshare__back">{s.back(l.comments, l.picks)}</span></>}</small>
                        </div>
                        <span className="bshare__acts">
                          {l.access === "link" && <>
                            <IconButton variant="quiet" size="s" icon={copied === l.id ? "check" : "link"} label={copied === l.id ? s.copied : s.copyLink} onClick={() => void copy(l.id, l.token)} />
                            {/* The quiet IconButton, size s, as a link */}
                            <a className="cr-iconbtn cr-iconbtn-quiet cr-iconbtn-s" href={urlOf(l.token)} target="_blank" rel="noreferrer" aria-label={s.openLink} data-tip={s.openLink}><Icon name="arrow-up-right" size={16} /></a>
                          </>}
                          <IconButton variant="quiet" size="s" icon="trash" label={s.revoke} onClick={() => void stop(l)} />
                        </span>
                      </div>
                      {l.access === "invite" && (
                        <Guests link={l} copied={copied} onCopy={(id, token) => void copy(id, token)}
                          onRemove={async (guestId) => { const r = await uninvite(projectId, guestId); if (r.ok) setLinks(r.data); else setError(r.error); }}
                          onInvite={async (list) => { const r = await inviteMore(projectId, l.id, list); if (r.ok) setLinks(r.data); else setError(r.error); return r.ok; }} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
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
          <IconButton variant="quiet" size="s" icon={copied === g.id ? "check" : "link"} label={copied === g.id ? s.copied : s.copyTheirs} onClick={() => onCopy(g.id, g.token)} />
          <IconButton variant="quiet" size="s" icon="trash" label={s.uninvite} onClick={() => void onRemove(g.id)} />
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
