// A reference as criterio.md tells it (lib/criterio-md.ts RefInfo), from what the app already holds: the item,
// what the AI read of it when it was saved (its tags) and its thread. Pure: no DOM, no server.
import type { InspoComment, InspoItem, InspoTags } from "@/types/inspo";
import type { Dict } from "@/lib/i18n/en";
import type { RefInfo } from "./criterio-md";
import { TAGS, TAG_THRESHOLD } from "./taxonomy";
import { mediaKindOf } from "./url";

/** The item's day (it travels as d/m/yyyy) as YYYY-MM-DD */
function dayOf(date: string): string | undefined {
  const m = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : undefined;
}

export function refInfoOf(item: InspoItem, tags: InspoTags | undefined, comments: InspoComment[] | undefined, t: Dict): RefInfo {
  const style = tags && (t.taxonomy.style as Record<string, string>)[tags.style];
  const sector = tags && (t.taxonomy.sector as Record<string, string>)[tags.sector];
  const traits = tags ? TAGS.filter((x) => (tags.tags[x.key] ?? 0) >= TAG_THRESHOLD).sort((a, b) => tags.tags[b.key] - tags.tags[a.key]).slice(0, 5).map((x) => (t.taxonomy.tag as Record<string, string>)[x.key] ?? x.key) : [];
  const said = [
    ...(item.note.trim() ? [{ who: item.addedBy, text: item.note.trim() }] : []),
    // Replies stay in the thread: the file carries what was said about the reference itself
    // A comment made with a picture keeps it: the words alone would not say what they point at
    ...(comments ?? []).filter((c) => (c.body.trim() || c.attachments?.length) && !c.parentId)
      .map((c) => ({ who: c.authorName, text: c.body.trim(), ...(c.attachments?.length ? { images: c.attachments.map((a) => a.url) } : {}) })),
  ];
  return {
    name: item.name, web: item.web, ...(item.source ? { source: item.source } : {}), kind: mediaKindOf(item.web), by: item.via ? t.mcp.byVia(item.addedBy, item.via) : item.addedBy, date: dayOf(item.date),
    // A picture is what the AI saw in it; a site, what it says it is
    what: (mediaKindOf(item.web) === "web" ? tags?.summary || tags?.visual : tags?.visual || tags?.summary) || undefined,
    tags: [style, sector, ...traits].filter((x): x is string => !!x),
    said,
  };
}
