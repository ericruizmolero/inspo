"use client";

import { useState, useRef, useEffect } from "react";
import { normalizeWebUrl } from "@/lib/url";
import { RECURSOS, RECURSOS_TOTAL, recursoShot } from "@/lib/recursos";
import { Icons } from "./Sidebar";
import { useT } from "./I18nProvider";
import s from "./EmptyStart.module.css";

// Siempre 9 webs (rejilla de 3×3): las más usadas y las más de moda ahora mismo, elegidas a mano
// y con una captura que se ve perfecta. Si alguna deja de estar en el directorio, se rellena
// con la primera de cada grupo que aún no esté representado, para no dejar la rejilla coja.
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
const ALL = RECURSOS.flatMap((g) => g.items.map((r) => ({ group: g, ...r })));
const PICKS = (() => {
  const picks = FEATURED.map((u) => ALL.find((r) => r.url === u)).filter((r): r is (typeof ALL)[number] => !!r);
  for (const g of RECURSOS) {
    if (picks.length >= 9) break;
    if (g.key === "recursos" || picks.some((r) => r.group.key === g.key)) continue;
    picks.push({ group: g, ...g.items[0] });
  }
  return picks.slice(0, 9);
})();

function Thumb({ name, url }: { name: string; url: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={s.thumb} aria-hidden>
      {failed ? name.slice(0, 1).toUpperCase() : (
        <img src={recursoShot(url)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      )}
    </span>
  );
}

const IcTag = (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 2.75h5.4c.33 0 .65.13.88.37l5.35 5.35a1.25 1.25 0 0 1 0 1.76l-3.4 3.4a1.25 1.25 0 0 1-1.76 0L3.12 8.28A1.25 1.25 0 0 1 2.75 7.4V2.75z" />
    <circle cx="5.5" cy="5.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const IcMd = <span className={s.md}>MD</span>;

// Cómo funciona la app, en el orden en que alguien la usa por primera vez.
// El texto de cada paso está en el diccionario (t.start.steps); aquí solo el icono.
const STEP_ICONS = [
  { key: "save", icon: Icons.plus },
  { key: "tag", icon: IcTag },
  { key: "search", icon: Icons.search },
  { key: "collections", icon: Icons.all },
  { key: "designMd", icon: IcMd },
  { key: "team", icon: Icons.users },
] as const;

interface EmptyStartProps {
  /** Guarda la primera inspo a partir de la URL (ya normalizada). Resuelve cuando termina el alta. */
  onAddUrl: (web: string) => Promise<void>;
  isDuplicate?: (web: string) => boolean;
  onRecursos: () => void;
}

/** Workspace sin inspos todavía: punto de partida en vez de un vacío. */
export default function EmptyStart({ onAddUrl, isDuplicate, onRecursos }: EmptyStartProps) {
  const { t } = useT();
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const web = normalizeWebUrl(raw);
    if (!web) { setError(t.start.notUrl); return; }
    if (isDuplicate?.(web)) { setError(t.start.alreadySaved); return; }
    setBusy(true);
    try { await onAddUrl(web); } finally { setBusy(false); }
  };

  return (
    <section className={s.wrap}>
      <div className={s.head} data-flip>
        <h1 className={s.title}>{t.start.title}</h1>
        <p className={s.lead}>{t.start.lead}</p>
        <form className={s.paste} onSubmit={submit}>
          <input
            ref={inputRef}
            className={`input input--lg ${s.pasteInput}`}
            value={raw}
            onChange={(e) => { setRaw(e.target.value); setError(""); }}
            placeholder={t.start.pasteUrl}
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            disabled={busy}
            aria-label={t.start.firstUrlLabel}
          />
          <button type="submit" className="btn btn--primary" disabled={busy || !raw.trim()}>
            {busy ? <span className="spinner" /> : Icons.plus}
            <span>{busy ? t.start.saving : t.start.save}</span>
          </button>
        </form>
        {error ? <p className={s.error}>{error}</p> : (
          <p className={s.sub}>
            {t.start.nothingToHandBefore}<strong>{t.start.sitesWord(RECURSOS_TOTAL)}</strong>{t.start.nothingToHandAfter}{" "}
            <button type="button" className={s.link} onClick={onRecursos}>{Icons.compass}<span>{t.start.openDirectory}</span></button>
          </p>
        )}
      </div>

      <div className={s.section}>
        <div className={s.eyebrow} data-flip>
          <span>{t.start.howItWorks}</span>
        </div>
        <ul className={s.steps}>
          {STEP_ICONS.map((st) => (
            <li key={st.key} className={s.step} data-flip>
              <span className={s.stepHead}>
                <span className={s.stepIcon}>{st.icon}</span>
              </span>
              <span className={s.stepTitle}>{t.start.steps[st.key].title}</span>
              <span className={s.stepText}>{t.start.steps[st.key].text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={s.section}>
        <div className={s.eyebrow} data-flip>
          <span>{t.start.trendingNow}</span>
          <button className={s.more} onClick={onRecursos}>{t.start.seeAll(RECURSOS_TOTAL)} {Icons.arrow}</button>
        </div>
        <div className={s.grid}>
          {PICKS.map((r) => (
            <a key={r.url} className={s.tile} data-flip href={r.url} target="_blank" rel="noopener noreferrer">
              <Thumb name={r.name} url={r.url} />
              <span className={s.text}>
                <span className={s.group}>{t.recursos.groups[r.group.key as keyof typeof t.recursos.groups].title}</span>
                <span className={s.name}>{r.name}{Icons.arrow}</span>
                <span className={s.desc}>{t.recursos.items[r.url]}</span>
              </span>
            </a>
          ))}
        </div>
      </div>

      <p className={s.tip} data-flip>{t.start.tip}</p>
    </section>
  );
}
