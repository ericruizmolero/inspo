"use client";

import { useState, useRef, useEffect } from "react";
import { normalizeWebUrl } from "@/lib/url";
import { DIRECTORY, DIRECTORY_TOTAL, siteShot } from "@/lib/directory";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import s from "./EmptyStart.module.css";
import { AddToLibrary } from "./DirectoryModal";

// Always 9 sites (3×3 grid): the most used and the most popular right now, picked by hand
// with a screenshot that looks perfect. If one leaves the directory, the first site of each
// group not yet shown fills the gap, so the grid never has a hole.
const FEATURED = [
  "https://styles.refero.design",
  "https://recent.design",
  "https://curated.design",
  "https://mobbin.com",
  "https://saasframe.io",
  "https://supahero.io",
  "https://motionin.design",
  "https://the-brandidentity.com",
  "https://www.cosmos.so",
];
const ALL = DIRECTORY.flatMap((g) => g.items.map((r) => ({ group: g, ...r })));
const PICKS = (() => {
  const picks = FEATURED.map((u) => ALL.find((r) => r.url === u)).filter((r): r is (typeof ALL)[number] => !!r);
  for (const g of DIRECTORY) {
    if (picks.length >= 9) break;
    if (g.key === "resources" || picks.some((r) => r.group.key === g.key)) continue;
    picks.push({ group: g, ...g.items[0] });
  }
  return picks.slice(0, 9);
})();

function Thumb({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={s.thumb} aria-hidden>
      {failed ? name.slice(0, 1).toUpperCase() : (
        <img src={siteShot(url)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}


const PER_TAB = 9;

interface EmptyStartProps {
  /** Saves the first inspo from the (already normalized) URL. Resolves when the save finishes. */
  onAddUrl: (web: string) => Promise<void>;
  isDuplicate?: (web: string) => boolean;
  onDirectory: () => void;
}

/**
 * Workspace with no inspos yet (Refero model): one prompt box to paste a URL, and under it the
 * directory in tabs, where any site goes into the library with one click.
 */
export default function EmptyStart({ onAddUrl, isDuplicate, onDirectory }: EmptyStartProps) {
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("picks");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const add = async (web: string) => {
    if (isDuplicate?.(web)) { setError(t.start.alreadySaved); return; }
    setBusy(true);
    try { await onAddUrl(web); } finally { setBusy(false); }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const web = normalizeWebUrl(raw);
    if (!web) { setError(t.start.notUrl); return; }
    add(web);
  };

  const group = DIRECTORY.find((g) => g.key === tab);
  const shown = group ? group.items.slice(0, PER_TAB).map((r) => ({ group, ...r })) : PICKS;
  const groupTitle = (key: string) => t.directory.groups[key as keyof typeof t.directory.groups].title;

  return (
    <section className={s.wrap}>
      <div className={s.head} data-flip>
        <h1 className={s.title}>{t.start.title}</h1>
        <p className={s.lead}>{t.start.lead}</p>
        <form className={s.prompt} onSubmit={submit}>
          <input
            ref={inputRef}
            className={s.promptInput}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(""); }}
            placeholder={t.start.pasteUrl}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-label={t.start.firstUrlLabel}
            aria-invalid={!!error}
            aria-describedby={error ? "start-url-error" : undefined}
          />
          <button type="submit" className={s.send} disabled={busy} aria-label={busy ? t.start.saving : t.start.save}>
            {busy ? <span className="spinner spinner--sm" /> : Icons.arrowUp}
          </button>
        </form>
        {error && <p id="start-url-error" className={s.error} role="alert">{error}</p>}
      </div>

      <div className={s.section} data-flip>
        <div className={s.tabs} role="group" aria-label={t.start.trendingNow}>
          {[{ key: "picks", title: t.directory.featured, n: PICKS.length },
            ...DIRECTORY.map((g) => ({ key: g.key, title: groupTitle(g.key), n: g.items.length }))].map((x) => (
            <button key={x.key} type="button" aria-pressed={tab === x.key}
              className={`${s.tab}${tab === x.key ? ` ${s.tabOn}` : ""}`} onClick={() => setTab(x.key)}>
              {x.title}<span className={s.tabCount}>{x.n}</span>
            </button>
          ))}
        </div>

        <div className={s.grid}>
          {shown.map((r) => (
            <div key={r.url} className={s.tile}>
              <a className={s.tileLink} href={r.url} target="_blank" rel="noopener noreferrer">
                <Thumb name={r.name} url={r.url} />
                <span className={s.text}>
                  <span className={s.group}>{groupTitle(r.group.key)}</span>
                  <span className={s.name}>{r.name}{Icons.arrow}</span>
                  <span className={s.desc}>{t.directory.items[r.url]}</span>
                </span>
              </a>
              {/* Outside the link, so the two targets never overlap */}
              <div className={s.foot}>
                <AddToLibrary url={r.url} name={r.name} added={!!isDuplicate?.(r.url)} onAdd={add} />
              </div>
            </div>
          ))}
        </div>

        <button type="button" className={s.more} onClick={onDirectory}>
          {Icons.compass}<span>{t.start.seeAll(DIRECTORY_TOTAL)}</span>{Icons.arrow}
        </button>
      </div>
    </section>
  );
}
