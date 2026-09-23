"use client";

import type { FilterAuthor, FilterDate, InspoItem, TagMap } from "@/types/inspo";
import { SECTORS, STYLES, TAGS, TAG_THRESHOLD } from "@/lib/taxonomy";
import { Chips, DATES, Icons, type TaggingState } from "./Sidebar";
import { useT } from "./I18nProvider";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Mobbin model: one row over the grid. Left, when (segmented) and the active filters as pills;
// right, one "Filtros" button that opens every other filter, and the AI tagging action.
export default function FilterBar({
  items, tagMap, authors, authorImages,
  author, date, sector, style, selTags,
  onAuthor, onDate, onSector, onStyle, onToggleTag, onClear,
  aiEnabled, pending, tagging, onTagAll,
}: {
  items: InspoItem[];
  tagMap: TagMap;
  authors: string[];
  authorImages: Record<string, string>;
  author: FilterAuthor;
  date: FilterDate;
  sector: string;
  style: string;
  selTags: string[];
  onAuthor: (a: FilterAuthor) => void;
  onDate: (f: FilterDate) => void;
  onSector: (s: string) => void;
  onStyle: (e: string) => void;
  onToggleTag: (k: string) => void;
  onClear: () => void;
  aiEnabled: boolean;
  pending: number;
  tagging: TaggingState;
  onTagAll: () => void;
}) {
  const { t } = useT();

  const sectorCounts: Record<string, number> = {};
  const styleCounts: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};
  const authorCounts: Record<string, number> = {};
  for (const it of items) {
    authorCounts[it.addedBy] = (authorCounts[it.addedBy] ?? 0) + 1;
    const tags = tagMap[it.web];
    if (!tags) continue;
    sectorCounts[tags.sector] = (sectorCounts[tags.sector] ?? 0) + 1;
    styleCounts[tags.style] = (styleCounts[tags.style] ?? 0) + 1;
    for (const k of Object.keys(tags.tags)) if (tags.tags[k] >= TAG_THRESHOLD) tagCounts[k] = (tagCounts[k] ?? 0) + 1;
  }

  const label = (map: Record<string, string>, k: string) => map[k] ?? k;
  const authorLabel = (a: string) => t.labels.author[a as keyof typeof t.labels.author] ?? a;
  // Everything in the panel, as removable pills in the row
  const active = [
    ...(author !== "all" ? [{ key: `a:${author}`, label: authorLabel(author), image: authorImages[author], remove: () => onAuthor("all") }] : []),
    ...(sector !== "all" ? [{ key: `s:${sector}`, label: label(t.taxonomy.sector, sector), remove: () => onSector("all") }] : []),
    ...(style !== "all" ? [{ key: `e:${style}`, label: label(t.taxonomy.style, style), remove: () => onStyle("all") }] : []),
    ...selTags.map((k) => ({ key: `t:${k}`, label: label(t.taxonomy.tag, k), remove: () => onToggleTag(k) })),
  ];
  const showTagging = aiEnabled && (pending > 0 || tagging.running || !!tagging.error);

  return (
    <div className="fbar" role="toolbar" aria-label={t.app.filters}>
      <div className="seg fbar__when" role="group" aria-label={t.sidebar.when}>
        {(["all", ...DATES] as FilterDate[]).map((f) => (
          <button key={f} type="button" aria-pressed={date === f}
            className={`seg__item${date === f ? " is-active" : ""}`} onClick={() => onDate(f)}>
            {f === "all" ? t.sidebar.anyTime : t.labels.date[f]}
          </button>
        ))}
      </div>

      <div className="fbar__active">
        {active.map((f) => (
          <button key={f.key} type="button" className="chip is-active fbar__pill" onClick={f.remove} aria-label={t.sidebar.removeFilter(f.label)}>
            {f.image && <span className="fbar__avatar"><img src={f.image} alt="" /></span>}
            {f.label}<span className="fbar__pill-x" aria-hidden>{Icons.x}</span>
          </button>
        ))}
        {(active.length > 0 || date !== "all") && (
          <Button variant="ghost" size="sm" className="fbar__clear" onClick={onClear}>{t.app.clear}</Button>
        )}
      </div>

      <div className="fbar__end">
        {showTagging && (
          <Button variant="ghost" size="sm" onClick={onTagAll} disabled={tagging.running}>
            {tagging.running
              ? <><span className="spinner spinner--sm" /> {t.sidebar.tagging(tagging.done, tagging.total)}</>
              : tagging.error ? t.sidebar.taggingFailed : <>{Icons.spark} {t.sidebar.tagPending(pending)}</>}
          </Button>
        )}
        <Popover>
          <PopoverTrigger className={`btn btn--ghost btn--sm fbar__open${active.length ? " is-on" : ""}`}>
            {Icons.sliders} {t.app.filters}
            {active.length > 0 && <span className="fbar__count">{active.length}</span>}
          </PopoverTrigger>
          <PopoverContent align="end" className="fbar__panel">
            {authors.length > 1 && (
              <section className="fbar__group">
                <h3 className="fbar__label">{t.sidebar.who}</h3>
                <Chips terms={authors.map((key) => ({ key, description: "" }))} counts={authorCounts}
                  labels={Object.fromEntries(authors.map((a) => [a, authorLabel(a)]))}
                  selected={author === "all" ? [] : [author]} onToggle={(k) => onAuthor(author === k ? "all" : k)} />
              </section>
            )}
            <section className="fbar__group">
              <h3 className="fbar__label">{t.sidebar.sector}</h3>
              <Chips terms={SECTORS} labels={t.taxonomy.sector} counts={sectorCounts} selected={sector === "all" ? [] : [sector]}
                onToggle={(k) => onSector(sector === k ? "all" : k)} />
            </section>
            <section className="fbar__group">
              <h3 className="fbar__label">{t.sidebar.style}</h3>
              <Chips terms={STYLES} labels={t.taxonomy.style} counts={styleCounts} selected={style === "all" ? [] : [style]}
                onToggle={(k) => onStyle(style === k ? "all" : k)} />
            </section>
            <section className="fbar__group">
              <h3 className="fbar__label">{t.sidebar.tags}</h3>
              <Chips terms={TAGS} labels={t.taxonomy.tag} counts={tagCounts} selected={selTags} onToggle={onToggleTag} />
            </section>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
