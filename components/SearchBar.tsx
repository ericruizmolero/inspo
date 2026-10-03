"use client";

// The one search box, docked at the bottom of the library; its suggestions open upwards. What it understood sits in it as chips (a person, a date, a colour, a section…);
// the rest of the text is searched by its words and by meaning. Suggestions follow the last words typed:
// ↑↓ to move, Enter or Tab to take one, Backspace on an empty field drops the last chip, Esc closes the
// list, then empties the field, then drops the chips. "/" focuses it from anywhere.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { facetOf } from "@/lib/taxonomy";
import { filterKey, suggest, type Filter, type Term2 } from "@/lib/search-query";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import type { Dict } from "@/lib/i18n/en";

/** What a chip says, in the reader's language */
export function filterLabel(f: Filter, t: Dict): string {
  switch (f.kind) {
    case "person": return f.value;
    case "media": return t.search.media[f.value as keyof Dict["search"]["media"]] ?? f.value;
    case "collection": return t.labels.type[f.value as keyof Dict["labels"]["type"]] ?? f.value;
    case "sector": return t.taxonomy.sector[f.value as keyof Dict["taxonomy"]["sector"]] ?? f.value;
    case "style": return t.taxonomy.style[f.value as keyof Dict["taxonomy"]["style"]] ?? f.value;
    case "date": {
      const m = f.value.match(/^m:(\d+)$/), y = f.value.match(/^y:(\d+)$/);
      return m ? t.search.months[Number(m[1]) - 1] : y ? y[1] : t.search.dates[f.value as keyof Dict["search"]["dates"]] ?? f.value;
    }
    case "tag": {
      const { field, key } = facetOf(f.value);
      const maps: Record<string, Record<string, string>> = {
        palette: t.taxonomy.color, sections: t.taxonomy.section, elements: t.taxonomy.element, type: t.taxonomy.type, layout: t.taxonomy.layout,
      };
      if (field === "credits") return t.panel.byCredit(key);
      if (field === "keywords") return key;
      return field ? maps[field][key] ?? key : t.taxonomy.tag[key as keyof Dict["taxonomy"]["tag"]] ?? key;
    }
  }
}

/** The dot or face a chip carries, when it has one */
function ChipMark({ f, swatches, faces }: { f: Filter; swatches: Record<string, string>; faces: Record<string, string> }) {
  if (f.kind === "tag" && f.value.startsWith("c:") && swatches[f.value.slice(2)]) {
    return <span className="sb__swatch" style={{ background: swatches[f.value.slice(2)] }} aria-hidden />;
  }
  if (f.kind === "person" && faces[f.value]) return <img className="sb__face" src={faces[f.value]} alt="" />;
  return null;
}

export default function SearchBar({ filters, text, onFilters, onText, vocab, busy, gathering, swatches, faces, className = "", onAsk, asking }: {
  filters: Filter[];
  text: string;
  onFilters: (f: Filter[]) => void;
  onText: (v: string) => void;
  vocab: Term2[];
  /** A slower layer (meaning, Jev) is still working */
  busy?: boolean;
  /** Items still gathering their tags */
  gathering?: number;
  /** Colour family → hex, for colour chips */
  swatches: Record<string, string>;
  /** Person → avatar */
  faces: Record<string, string>;
  className?: string;
  /** The words are a request, not a search: Enter (with no suggestion open) or ⌘Enter hands them to the agent */
  onAsk?: (text: string) => void;
  asking?: boolean;
}) {
  const { t } = useT();
  const ref = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [closed, setClosed] = useState(false);

  const options = useMemo(() => (focused && !closed ? suggest(text, vocab, filters) : []), [focused, closed, text, vocab, filters]);
  // New words, first suggestion: reset while rendering, not in an effect after the paint
  const [lastText, setLastText] = useState(text);
  // Enter sends the words to the agent unless the person walked into the list with the arrows
  const [walked, setWalked] = useState(false);
  if (text !== lastText) { setLastText(text); setActive(0); setWalked(false); }

  // "/" from anywhere focuses the box
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      ref.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const take = (o: { term: Term2; consumed: number }) => {
    const rest = text.trimEnd();
    onText(rest.slice(0, rest.length - o.consumed).trimEnd());
    onFilters([...filters, o.term.filter]);
    ref.current?.focus();
  };
  const drop = (f: Filter) => { onFilters(filters.filter((x) => filterKey(x) !== filterKey(f))); ref.current?.focus(); };

  const ask = () => { const v = text.trim(); if (v && onAsk && !asking) onAsk(v); };
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onAsk) { e.preventDefault(); ask(); return; }
    if (options.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActive((a) => (a + (e.key === "ArrowDown" ? 1 : options.length - 1)) % options.length);
      setWalked(true);
      return;
    }
    if (options.length && ((e.key === "Enter" && (walked || !onAsk)) || (e.key === "Tab" && !e.shiftKey))) { e.preventDefault(); take(options[active]); return; }
    if (e.key === "Enter" && onAsk && text.trim()) { e.preventDefault(); ask(); return; }
    if (e.key === "Backspace" && !text && filters.length && ref.current?.selectionStart === 0) { e.preventDefault(); onFilters(filters.slice(0, -1)); return; }
    if (e.key === "Escape") {
      if (options.length) { e.preventDefault(); setClosed(true); return; }
      if (text) { e.preventDefault(); onText(""); return; }
      if (filters.length) { e.preventDefault(); onFilters([]); return; }
      ref.current?.blur();
    }
  };

  const empty = !text && !filters.length;
  const open = options.length > 0;
  return (
    <div className={`sb ${className}${open ? " is-open" : ""}`}>
      <div className="sb__field" onClick={() => ref.current?.focus()}>
        <span className="sb__icon" aria-hidden>{busy ? <span className="spinner spinner--sm" /> : Icons.search}</span>
        {filters.map((f) => {
          const label = filterLabel(f, t);
          return (
            <span key={filterKey(f)} className={`sb__chip sb__chip--${f.kind}`}>
              <ChipMark f={f} swatches={swatches} faces={faces} />
              <span className="sb__chip-label">{label}</span>
              <button type="button" className="sb__chip-x" aria-label={t.search.remove(label)} onClick={(e) => { e.stopPropagation(); drop(f); }}>{Icons.x}</button>
            </span>
          );
        })}
        <input
          ref={ref}
          className="sb__input"
          value={text}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open ? `${listId}-${active}` : undefined}
          aria-label={t.search.placeholderShort}
          placeholder={filters.length ? "" : t.search.placeholder}
          onChange={(e) => { onText(e.target.value); setClosed(false); }}
          onKeyDown={onKeyDown}
          onFocus={() => { setFocused(true); setClosed(false); }}
          onBlur={() => setFocused(false)}
        />
        <span className="sb__right">
          {gathering ? <span className="sb__gathering" role="status">{Icons.spark} {t.sidebar.gathering(gathering)}</span> : null}
          {onAsk && text.trim() && (
            <button type="button" className="sb__ask" disabled={asking} aria-label={t.agent.ask} title={t.agent.hint} onClick={(e) => { e.stopPropagation(); ask(); }}>
              {asking ? <span className="spinner spinner--sm" /> : Icons.spark}<span className="sb__ask-label">{asking ? t.agent.thinking : t.agent.ask}</span>
            </button>
          )}
          {empty ? <kbd className="search__kbd" aria-hidden>/</kbd> : (
            <button type="button" className="sb__clear" aria-label={t.search.clear} onClick={(e) => { e.stopPropagation(); onText(""); onFilters([]); }}>{Icons.x}</button>
          )}
        </span>
      </div>
      {open && (
        <ul id={listId} role="listbox" className="sb__menu" aria-label={t.search.suggestions}>
          {options.map((o, i) => (
            <li
              key={filterKey(o.term.filter)}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={`sb__option${i === active ? " is-active" : ""}`}
              // Before the field's blur, so the click lands
              onMouseDown={(e) => { e.preventDefault(); take(o); }}
              onMouseEnter={() => setActive(i)}
            >
              <ChipMark f={o.term.filter} swatches={swatches} faces={faces} />
              <span className="sb__option-label">{filterLabel(o.term.filter, t)}</span>
              <span className="sb__option-group">{t.search.groups[o.term.group]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
