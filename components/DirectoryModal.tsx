"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DIRECTORY, DIRECTORY_TOTAL, siteShot, type DirectorySite } from "@/lib/directory";
import { Icons, SearchBox } from "./Sidebar";
import { useT } from "./I18nProvider";
import en from "@/lib/i18n/en";
import es from "@/lib/i18n/es";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";

type GroupKey = keyof typeof en.directory.groups;

// Search looks at both languages: the word in someone's head may be
// "tipografía" even while they use the app in English.
const text = (url: string) => `${en.directory.items[url] ?? ""} ${es.directory.items[url] ?? ""}`;
const titles = (key: string) =>
  `${en.directory.groups[key as GroupKey]?.title ?? ""} ${es.directory.groups[key as GroupKey]?.title ?? ""}`;

interface DirectoryModalProps {
  onClose: () => void;
  /** Signed out: only a sample; the rest shows blurred behind a sign-in button. */
  guest?: boolean;
  /** Save a site into the library (signed in only) */
  onAdd?: (url: string) => void;
  isAdded?: (url: string) => boolean;
}

// Fisher–Yates. Shuffled once per modal opening (the component mounts every time it opens).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// What a guest sees: 6 fixed sites (different from the 9 on the home page) and 3 more blurred
// as bait. Always the same: if random, reloading would end up showing everything.
// If one leaves the directory, the first available one fills the gap.
const GUEST_SAMPLE = [
  "https://goatedui.dev",
  "https://landing.love",
  "https://saaspo.com",
  "https://navbar.gallery",
  "https://60fps.design",
  "https://klim.co.nz",
];
const GUEST_TEASER = ["https://refero.design", "https://www.fontshare.com", "https://savee.it"];
const ALL = DIRECTORY.flatMap((g) => g.items);
function pick(urls: string[], n: number, exclude: DirectorySite[] = []): DirectorySite[] {
  const out = urls.map((u) => ALL.find((r) => r.url === u)).filter((r): r is DirectorySite => !!r);
  for (const r of ALL) {
    if (out.length >= n) break;
    if (!out.includes(r) && !exclude.includes(r)) out.push(r);
  }
  return out.slice(0, n);
}
const SAMPLE = pick(GUEST_SAMPLE, 6);
const TEASER = pick(GUEST_TEASER, 3, SAMPLE);
// After sign-in it returns to the home page with the directory open (InspoClient reads ?directory=1)
const LOGIN_HREF = `/login?next=${encodeURIComponent("/?directory=1")}`;

const IcArrow = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10l6-6M5 4h5v5" />
  </svg>
);

/** Static thumbnail from public/directory (scripts/directory-shots.ts); if missing, the name's initial. */
function RecThumb({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`dir-row__thumb${failed ? " is-fallback" : ""}`} aria-hidden>
      {failed ? name.slice(0, 1).toUpperCase() : (
        <img src={siteShot(url)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

/** Saves a directory site into the library. Once it is there, it says so and stays still. */
export function AddToLibrary({ url, name, onAdd, added, className = "" }: {
  url: string; name: string; onAdd: (url: string) => void; added: boolean; className?: string;
}) {
  const { t } = useT();
  return (
    <button type="button" className={`dir-add${added ? " is-added" : ""} ${className}`} disabled={added}
      onClick={() => onAdd(url)} aria-label={added ? t.directory.addedLabel(name) : t.directory.addLabel(name)}>
      {added ? Icons.check : Icons.plus}<span>{added ? t.directory.added : t.directory.add}</span>
    </button>
  );
}

function RecRow({ name, url, desc, onAdd, isAdded }: {
  name: string; url: string; desc: string; onAdd?: (url: string) => void; isAdded?: (url: string) => boolean;
}) {
  return (
    <li className="dir-item">
      {onAdd ? (
        // The card holds the link and the button side by side, so the two targets never overlap
        <div className="dir-row dir-row--add">
          <a className="dir-row__link" href={url} target="_blank" rel="noopener noreferrer">
            <RecThumb name={name} url={url} />
            <span className="dir-row__text">
              <span className="dir-row__name">{name}</span>
              <span className="dir-row__desc">{desc}</span>
            </span>
          </a>
          <AddToLibrary url={url} name={name} onAdd={onAdd} added={!!isAdded?.(url)} className="dir-row__add" />
        </div>
      ) : (
        <a className="dir-row" href={url} target="_blank" rel="noopener noreferrer">
          <RecThumb name={name} url={url} />
          <span className="dir-row__text">
            <span className="dir-row__name">{name}</span>
            <span className="dir-row__desc">{desc}</span>
          </span>
          <span className="dir-row__arrow">{IcArrow}</span>
        </a>
      )}
    </li>
  );
}

/** Modal body for a guest: the sample, and the rest blurred with the sign-in button. */
function GuestBody() {
  const { t } = useT();
  const hidden = DIRECTORY_TOTAL - SAMPLE.length;
  return (
    <>
      <section className="dir-group">
        <header className="dir-group__head">
          <h3 className="dir-group__title">{t.directory.sample}</h3>
          <span className="dir-group__count">{SAMPLE.length}</span>
          <span className="dir-group__hint">{t.directory.sampleHint}</span>
        </header>
        <ul className="dir-list">
          {SAMPLE.map((r) => <RecRow key={r.url} name={r.name} url={r.url} desc={t.directory.items[r.url]} />)}
        </ul>
      </section>

      <section className="dir-gate" aria-label={t.directory.gateLabel(hidden)}>
        {/* Filler rows: blurred, and they can't be opened or selected */}
        <ul className="dir-list dir-gate__rows" aria-hidden inert>
          {TEASER.map((r) => <RecRow key={r.url} name={r.name} url={r.url} desc={t.directory.items[r.url]} />)}
        </ul>
        <div className="dir-gate__cta">
          <p className="dir-gate__title">{t.directory.moreInside(hidden)}</p>
          <p className="dir-gate__groups">
            {DIRECTORY.map((g) => (
              <span key={g.key} className="chip" aria-hidden>{t.directory.groups[g.key as GroupKey].title}<span className="chip__count">{g.items.length}</span></span>
            ))}
          </p>
          <Link href={LOGIN_HREF} className={buttonVariants({ variant: "primary" })}>{t.directory.signInForAll}</Link>
          <p className="dir-gate__note">{t.directory.free}</p>
        </div>
      </section>
    </>
  );
}

export default function DirectoryModal({ onClose, guest = false, onAdd, isAdded }: DirectoryModalProps) {
  const { t } = useT();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<string>("todas");
  const [base] = useState(() => DIRECTORY.map((g) => ({ ...g, items: shuffle(g.items) })));

  // Plain search: name, description, URL and group, ignoring accents and case
  const groups = useMemo(() => {
    const needle = norm(q.trim());
    return base
      .filter((g) => tab === "todas" || g.key === tab)
      .map((g) => ({
        ...g,
        items: needle ? g.items.filter((r) => norm(`${r.name} ${text(r.url)} ${r.url} ${titles(g.key)}`).includes(needle)) : g.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [base, q, tab]);

  const shown = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      {/* The search box takes focus on open; guests have none, so the default applies */}
      <DialogContent size="lg" className="dir-modal" initialFocus={() => document.querySelector<HTMLElement>(".dir-modal__tools input")}>
        <div className="dir-modal__header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <DialogTitle className="dir-modal__title">{t.directory.title}</DialogTitle>
            <p className="dir-modal__lead">
              {t.directory.lead(DIRECTORY_TOTAL)}
              {guest && <> {t.directory.guestNote} <Link href={LOGIN_HREF}>{t.directory.guestSignIn}</Link> {t.directory.guestNoteEnd}</>}
            </p>
          </div>
          <DialogClose render={<Button variant="icon" aria-label={t.common.close} />}>{Icons.x}</DialogClose>
        </div>

        {!guest && (
          <div className="dir-modal__tools">
            <SearchBox value={q} onChange={setQ} autoFocus />
            <div className="dir-modal__tabs">
              <button className={`chip${tab === "todas" ? " is-active" : ""}`} onClick={() => setTab("todas")}>
                {t.directory.all}<span className="chip__count">{DIRECTORY_TOTAL}</span>
              </button>
              {DIRECTORY.map((g) => (
                <button key={g.key} className={`chip${tab === g.key ? " is-active" : ""}`} onClick={() => setTab(tab === g.key ? "todas" : g.key)}>
                  {t.directory.groups[g.key as GroupKey].title}<span className="chip__count">{g.items.length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`modal__body dir-modal__body${guest ? " dir-modal__body--guest" : ""}`}>
          {guest ? <GuestBody /> : (
            <>
              {groups.length === 0 && (
                <div className="dir-empty">{t.directory.noMatch}</div>
              )}
              {groups.map((g) => (
                <section key={g.key} className="dir-group">
                  <header className="dir-group__head">
                    <h3 className="dir-group__title">{t.directory.groups[g.key as GroupKey].title}</h3>
                    <span className="dir-group__count">{g.items.length}</span>
                    <span className="dir-group__hint">{t.directory.groups[g.key as GroupKey].hint}</span>
                  </header>
                  <ul className="dir-list">
                    {g.items.map((r) => <RecRow key={r.url} name={r.name} url={r.url} desc={t.directory.items[r.url]} onAdd={onAdd} isAdded={isAdded} />)}
                  </ul>
                </section>
              ))}
              {(q || tab !== "todas") && shown > 0 && (
                <div className="sidebar__footer-note" style={{ padding: 0 }}>{t.directory.showing(shown, DIRECTORY_TOTAL)}</div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
