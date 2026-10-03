"use client";
// The stage of an area. Opening a node clears the sea: the eight nodes fold into a row of tabs and the
// canvas becomes the place where that area is worked on. Typography gets a type tester, set in the real
// faces of the references filed under it; every area gets its references as chips, to add from the
// project or the Inbox and to take away.
import { useEffect, useMemo, useRef, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import type { AreaCuration, SystemArea, SystemAreaState } from "@/types/system";
import type { RefVisual } from "@/lib/system";
import type { RefFace } from "@/lib/ref-fonts";
import { fontCandidateId } from "@/lib/candidates";
import { familyBase, familyKey, genericOf, weightInName } from "@/lib/font-names";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { areaIcon } from "./area-icons";
import { cachedCardImage } from "./InspoCard";
import "./SystemStage.css";

export function Thumb({ item, image, className = "" }: { item: InspoItem; image: string | null; className?: string }) {
  const [at, setAt] = useState(0);
  const srcs = [image, cachedCardImage(item.web), `/api/og?url=${encodeURIComponent(item.web)}`].filter((x): x is string => !!x);
  const src = srcs[at];
  return <span className={`sysv-thumb${className ? ` ${className}` : ""}`} aria-hidden>{src ? <img key={src} src={src} alt="" loading="lazy" decoding="async" onError={() => setAt((i) => i + 1)} /> : item.name.slice(0, 1).toUpperCase()}</span>;
}

// ─── The nodes, as tabs ──────────────────────────────────────────────────────

export function AreaTabs({ areas, labels, open, onOpen, onBack, projectName }: {
  areas: SystemAreaState[]; labels: Record<SystemArea, string>; open: SystemArea;
  onOpen: (area: SystemArea) => void; onBack: () => void; projectName: string;
}) {
  const { t } = useT();
  return (
    <nav className="sysf-tabs" aria-label={t.system.button}>
      <button type="button" className="sysf-back" onClick={onBack} title={t.system.stage.back}>{Icons.arrow}<span>{projectName}</span></button>
      <div className="sysf-tabs__list" role="tablist">
        {areas.map((a) => (
          <button key={a.area} type="button" role="tab" aria-selected={open === a.area}
            className={`sysf-tab${open === a.area ? " is-on" : ""}${a.decision ? "" : " is-empty"}${a.source === "team" ? " is-team" : ""}`}
            style={{ viewTransitionName: `sysa-${a.area}` }} onClick={() => onOpen(a.area)}>
            {areaIcon(a.area, 13)}{labels[a.area]}{a.evidence.length > 0 && <b>{a.evidence.length}</b>}
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── The references of the area: chips to take away, a picker to add ──────────

interface StripProps {
  areaLabel: string;
  /** The references filed under the area (its evidence that still exists) */
  refs: InspoItem[];
  /** The project's board and the unfiled references: what the picker offers */
  board: InspoItem[];
  inbox: InspoItem[];
  imageOf: (item: InspoItem) => string | null;
  /** Ids being added or taken away right now */
  pending: Set<string>;
  onToggle: (item: InspoItem, on: boolean) => void;
  /** Choosing which references decide the area: the chips become switches */
  picking: { picked: Set<string>; toggle: (id: string) => void } | null;
}

export function RefStrip({ areaLabel, refs, board, inbox, imageOf, pending, onToggle, picking }: StripProps) {
  const { t } = useT();
  const [adding, setAdding] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!adding) return;
    const down = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setAdding(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setAdding(false); } };
    document.addEventListener("mousedown", down); document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key, true); };
  }, [adding]);
  const inArea = useMemo(() => new Set(refs.map((i) => i.id)), [refs]);
  const match = (i: InspoItem) => { const s = q.trim().toLowerCase(); return !s || i.name.toLowerCase().includes(s) || i.web.toLowerCase().includes(s); };
  const fromBoard = board.filter((i) => i.id && match(i));
  const fromInbox = inbox.filter((i) => i.id && match(i)).slice(0, 60);
  const card = (i: InspoItem) => {
    const on = inArea.has(i.id);
    return (
      <button key={i.id} type="button" className={`sysf-pick${on ? " is-on" : ""}${pending.has(i.id!) ? " is-busy" : ""}`} aria-pressed={on} title={i.name} onClick={() => onToggle(i, !on)}>
        <Thumb item={i} image={imageOf(i)} className="sysf-pick__img" />
        <span className="sysf-pick__name">{i.name}</span>
        <i className="sysf-pick__mark">{on ? Icons.check : Icons.plus}</i>
      </button>
    );
  };
  return (
    <div className="sysf-refs" ref={box}>
      {refs.length === 0 && <span className="sysf-refs__none">{t.system.stage.none(areaLabel)}</span>}
      {refs.map((i) => {
        const picked = picking?.picked.has(i.id!) ?? false;
        return picking ? (
          <button key={i.id} type="button" className={`sysf-chip is-pickable${picked ? " is-picked" : ""}`} aria-pressed={picked} onClick={() => picking.toggle(i.id!)}>
            <Thumb item={i} image={imageOf(i)} /><span>{i.name}</span><i className="sysf-chip__x">{picked && Icons.check}</i>
          </button>
        ) : (
          <span key={i.id} className={`sysf-chip${pending.has(i.id!) ? " is-busy" : ""}`} data-id={i.id}>
            <Thumb item={i} image={imageOf(i)} /><span>{i.name}</span>
            <button type="button" className="sysf-chip__x" aria-label={t.system.stage.remove(i.name)} title={t.system.stage.remove(i.name)} onClick={() => onToggle(i, false)}>{Icons.x}</button>
          </span>
        );
      })}
      {!picking && (
        <button type="button" className={`sysf-add${adding ? " is-on" : ""}`} aria-expanded={adding} onClick={() => { setAdding((o) => !o); setQ(""); }}>{Icons.plus} {t.system.stage.add}</button>
      )}
      {adding && (
        <div className="sysf-picker" role="dialog" aria-label={t.system.stage.add}>
          <input className="sysf-picker__search" value={q} autoFocus placeholder={t.system.stage.search} onChange={(e) => setQ(e.target.value)} />
          <div className="sysf-picker__scroll">
            {fromBoard.length > 0 && <><p className="sysf-picker__title">{t.system.stage.inProject}</p><div className="sysf-picker__grid">{fromBoard.map(card)}</div></>}
            {fromInbox.length > 0 && <><p className="sysf-picker__title">Inbox <small>{t.system.stage.inboxHint}</small></p><div className="sysf-picker__grid">{fromInbox.map(card)}</div></>}
            {fromBoard.length + fromInbox.length === 0 && <p className="sysv-muted">{t.system.stage.nothing}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── The real faces of the references ────────────────────────────────────────
// The files come from /api/system/fonts (the sites' own @font-face rules). Each family is registered
// under a name of its own per reference, so a site's "Inter" never replaces the app's.

const registered = new Set<string>();
const aliasOf = (itemId: string, key: string) => `ref-${itemId.slice(0, 12)}-${key}`;
function register(itemId: string, faces: RefFace[]) {
  for (const f of faces) {
    const key = familyKey(f.family);
    if (!key) continue;
    const named = weightInName(f.family);
    const weight = named && f.weight === "400" ? String(named) : f.weight;
    const id = `${itemId}|${key}|${weight}|${f.style}|${f.unicodeRange ?? ""}`;
    if (registered.has(id)) continue;
    registered.add(id);
    try {
      document.fonts.add(new FontFace(aliasOf(itemId, key), `url("${f.src}")`, { weight, style: f.style, display: "swap", ...(f.unicodeRange ? { unicodeRange: f.unicodeRange } : {}) }));
    } catch { /* a descriptor the browser does not take: that face is skipped */ }
  }
}

const fetched = new Map<string, RefFace[]>();  // `${projectId}|${itemId}` → faces, for the life of the page
function useRefFaces(projectId: string, itemIds: string[]): Record<string, RefFace[] | undefined> {
  const [, bump] = useState(0);
  const asking = useRef(new Set<string>());
  const want = itemIds.join(",");
  useEffect(() => {
    const missing = itemIds.filter((id) => !fetched.has(`${projectId}|${id}`) && !asking.current.has(id));
    if (!missing.length) return;
    // No cleanup: the answer is kept for the page whoever asked, and a second mount finds it there
    missing.forEach((id) => asking.current.add(id));
    fetch(`/api/system/fonts?projectId=${encodeURIComponent(projectId)}&ids=${missing.map(encodeURIComponent).join(",")}`)
      .then((r) => (r.ok ? r.json() : { faces: {} }))
      .then((json: { faces?: Record<string, RefFace[]> }) => {
        for (const id of missing) { const faces = json.faces?.[id] ?? []; fetched.set(`${projectId}|${id}`, faces); register(id, faces); }
      })
      .catch(() => { for (const id of missing) fetched.set(`${projectId}|${id}`, []); })
      .finally(() => { missing.forEach((id) => asking.current.delete(id)); bump((n) => n + 1); });
  }, [projectId, want]); // eslint-disable-line react-hooks/exhaustive-deps
  return Object.fromEntries(itemIds.map((id) => [id, fetched.get(`${projectId}|${id}`)]));
}

// ─── The type tester ─────────────────────────────────────────────────────────

type Role = "display" | "body" | "ui" | "mono";
interface TypeRow {
  key: string;
  label: string;
  role: Role | null;
  /** Candidate ids of the area's table this row answers for (lib/candidates.ts) */
  ids: string[];
  weights: number[];
  /** The weight the reference sets it in, when its sheet says */
  prefer: number | null;
  /** CSS font-family: the reference's own face first, then the name, then a generic */
  css: string;
  /** site / google: the file was found there. local: no file, it shows only if this machine has the family.
   *  system: a CSS keyword (ui-monospace), there is no file to find. loading: still asking */
  from: "site" | "google" | "local" | "system" | "loading";
  refs: string[];
}

const KEYWORD = /^(ui-[a-z-]+|system-ui|-apple-system|blinkmacsystemfont|sans-serif|serif|monospace|cursive)$/i;
const ROLE_RANK: Record<string, number> = { display: 0, body: 1, ui: 2, mono: 3 };

function typeRows(refs: InspoItem[], byItem: Map<string, RefVisual>, faces: Record<string, RefFace[] | undefined>): { rows: TypeRow[]; silent: InspoItem[] } {
  const rows = new Map<string, TypeRow>();
  const silent: InspoItem[] = [];
  for (const item of refs) {
    const id = item.id!;
    const found = faces[id];
    const groups = new Map<string, RefFace[]>();
    for (const f of found ?? []) { const k = familyKey(f.family); groups.set(k, [...(groups.get(k) ?? []), f]); }
    const sheet = byItem.get(id)?.fonts ?? [];
    // With a sheet, the families the page really uses; without one, the ones its CSS declares
    const entries: { name: string; role: Role | null; weights: number[]; listed: boolean }[] = sheet.length
      ? sheet.map((f) => ({ name: f.family, role: f.role, weights: f.weights, listed: true }))
      : [...groups.values()].slice(0, 6).map((list) => ({ name: list[0].family, role: null, weights: [], listed: false }));
    if (!entries.length && found) silent.push(item);
    for (const e of entries) {
      const keyword = KEYWORD.test(e.name.trim());
      const key = keyword ? e.name.trim().toLowerCase() : familyKey(e.name);
      if (!key) continue;
      const mine = groups.get(key);
      const label = keyword ? e.name.trim() : familyBase(e.name);
      const row = rows.get(key) ?? { key, label, role: e.role, ids: [], weights: [], prefer: e.weights[0] ?? null, css: keyword ? label : `"${label}", ${genericOf(label)}`, from: keyword ? "system" : found ? "local" : "loading", refs: [] } as TypeRow;
      if (e.listed) row.ids.push(fontCandidateId(e.name));
      if (!row.refs.includes(id)) row.refs.push(id);
      const weights = new Set([...row.weights, ...e.weights]);
      if (mine?.length && (row.from === "local" || row.from === "loading")) {
        row.css = `"${aliasOf(id, key)}", "${label}", ${genericOf(label)}`;
        row.from = mine[0].from;
        for (const f of mine) {
          const [lo, hi] = f.weight.split(/\s+/).map(Number);
          if (hi) { for (const w of [300, 400, 500, 600, 700]) if (w >= lo && w <= hi) weights.add(w); }
          else if (lo) weights.add(weightInName(f.family) && lo === 400 ? weightInName(f.family)! : lo);
        }
      }
      row.weights = [...weights].sort((a, b) => a - b);
      rows.set(key, row);
    }
  }
  return { rows: [...rows.values()].sort((a, b) => (ROLE_RANK[a.role ?? ""] ?? 4) - (ROLE_RANK[b.role ?? ""] ?? 4)), silent };
}

type Mode = "headline" | "paragraph" | "alphabet";
const SIZES: Record<Mode, number> = { headline: 64, paragraph: 20, alphabet: 40 };
const ALPHABET = "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ abcdefghijklmnñopqrstuvwxyz 0123456789 ¿?¡!&@€";

interface TesterProps {
  projectId: string;
  projectName: string;
  /** The project's criterio in a paragraph, when it has one: the paragraph sample */
  summary: string;
  /** The references whose faces are tested, and what their sheets say */
  refs: InspoItem[];
  visuals: RefVisual[];
  curation: AreaCuration | null;
  curating: boolean;
  busy: boolean;
  itemOf: (id: string) => InspoItem | undefined;
  imageOf: (item: InspoItem) => string | null;
  onFlip: (id: string, keep: boolean) => void;
  onReason: (id: string, keep: boolean, reason: string) => void;
}

export function TypeTester({ projectId, projectName, summary, refs, visuals, curation, curating, busy, itemOf, imageOf, onFlip, onReason }: TesterProps) {
  const { t } = useT();
  const tt = t.system.type;
  const [mode, setMode] = useState<Mode>("headline");
  const [sizes, setSizes] = useState(SIZES);
  const [weightOf, setWeightOf] = useState<Record<string, number>>({});
  // What the team types to try stays with the project on this machine
  const store = `criterio:type-sample:${projectId}`;
  const [text, setText] = useState("");
  useEffect(() => { try { setText(localStorage.getItem(store) ?? ""); } catch { /* private mode */ } }, [store]);
  const type = (v: string) => { setText(v); try { if (v) localStorage.setItem(store, v); else localStorage.removeItem(store); } catch { /* private mode */ } };
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const ids = useMemo(() => refs.map((i) => i.id!).filter(Boolean), [refs]);
  const faces = useRefFaces(projectId, ids);
  const byItem = useMemo(() => new Map(visuals.map((v) => [v.itemId, v])), [visuals]);
  const { rows, silent } = typeRows(refs, byItem, faces);
  const loading = ids.some((id) => faces[id] === undefined);

  const sample = text.trim() || (mode === "headline" ? projectName : mode === "paragraph" ? summary || tt.paragraphSample : ALPHABET);
  const size = sizes[mode];
  const verdictOf = (row: TypeRow) => curation?.verdicts.find((v) => row.ids.includes(v.id));

  return (
    <section className="tt">
      <div className="tt-bar">
        <div className="tt-modes" role="tablist">
          {(["headline", "paragraph", "alphabet"] as Mode[]).map((m) => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} className={`tt-mode${mode === m ? " is-on" : ""}`} onClick={() => setMode(m)}>{tt.modes[m]}</button>
          ))}
        </div>
        <input className="tt-input" value={text} placeholder={tt.placeholder} maxLength={400} onChange={(e) => type(e.target.value)} />
        <label className="tt-size">
          <span>{size} px</span>
          <input type="range" min={12} max={160} step={1} value={size} aria-label={tt.size} onChange={(e) => setSizes((s) => ({ ...s, [mode]: Number(e.target.value) }))} />
        </label>
      </div>

      {rows.length > 0 && <p className="tt-count">{tt.families(rows.length, refs.length - silent.length)}{curating && <> <span className="spinner spinner--sm" /> {t.system.curating}</>}</p>}
      {rows.length === 0 && (loading
        ? <p className="tt-empty"><span className="spinner spinner--sm" /> {tt.loading}</p>
        : <p className="tt-empty">{refs.length ? tt.empty : tt.noRefs}</p>)}

      <ul className="tt-list">
        {rows.map((row) => {
          const v = verdictOf(row);
          const weight = weightOf[row.key] ?? row.prefer ?? (row.weights.includes(400) ? 400 : row.weights[0] ?? 400);
          const sources = row.refs.map((id) => itemOf(id)).filter((x): x is InspoItem => !!x);
          return (
            <li key={row.key} className={`tt-row${v && !v.keep ? " is-out" : ""}${v?.keep ? " is-kept" : ""}`}>
              <header className="tt-row__head">
                <span className="tt-row__name">{row.label}</span>
                {row.role && <span className="tt-row__meta">{tt.roles[row.role]}</span>}
                {row.weights.length > 1 && (
                  <span className="tt-weights">
                    {row.weights.map((w) => <button key={w} type="button" className={`tt-weight${w === weight ? " is-on" : ""}`} aria-pressed={w === weight} onClick={() => setWeightOf((m) => ({ ...m, [row.key]: w }))}>{w}</button>)}
                  </span>
                )}
                {row.from === "google" && <span className="tt-row__meta">Google Fonts</span>}
                {row.from === "local" && <span className="tt-row__meta tt-row__meta--warn" title={tt.localHint}>{tt.local}</span>}
                <span className="tt-row__refs">
                  {sources.slice(0, 4).map((it) => <Thumb key={it.id} item={it} image={imageOf(it)} />)}
                  <small>{sources.length === 1 ? sources[0].name : t.system.evidence(sources.length)}</small>
                </span>
                {v && (
                  <button type="button" className={`sysc__verdict${v.keep ? " is-kept" : ""}`} disabled={busy} aria-pressed={v.keep} onClick={() => onFlip(v.id, !v.keep)}>
                    {v.keep ? <>{Icons.check} {t.system.kept}</> : t.system.discarded}
                  </button>
                )}
              </header>
              <p className={`tt-row__specimen tt-row__specimen--${mode}`} style={{ fontFamily: row.css, fontWeight: weight, fontSize: size }}>{sample}</p>
              {v && (editing === v.id ? (
                <input className="input sysc__reason-input" value={draft} autoFocus maxLength={160} onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => { if (draft.trim() !== v.reason) onReason(v.id, v.keep, draft.trim()); setEditing(null); }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { e.stopPropagation(); setEditing(null); } }} />
              ) : (
                <button type="button" className="sysc__reason tt-row__reason" title={t.system.editReason} onClick={() => { setDraft(v.reason); setEditing(v.id); }}>{v.reason || t.system.noReason}</button>
              ))}
            </li>
          );
        })}
      </ul>
      {silent.length > 0 && rows.length > 0 && <p className="tt-silent">{tt.silent(silent.map((i) => i.name).join(", "))}</p>}
    </section>
  );
}
