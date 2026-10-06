// The templates list, read ahead and kept. Apart from TemplatesView so the board can preload it
// while idle without loading the view itself, which only shows in Discover.
import type { TemplateCard } from "@/types/system";
import { loadTemplates } from "@/app/actions/templates";

export const posterOf = (tpl: TemplateCard) => tpl.template.poster ?? (tpl.template.builtin ? `/templates/${tpl.template.builtin}.jpg` : undefined);

// The last list seen, per workspace: coming back to the templates shows them at once while they are read again.
// It is also kept in the browser, so the first visit after a reload does not wait for the server either
export const seen = new Map<string, TemplateCard[]>();
const storeKey = (workspaceId: string) => `criterio:templates:${workspaceId}`;
export function remembered(workspaceId: string): TemplateCard[] | null {
  const hit = seen.get(workspaceId);
  if (hit) return hit;
  try { const raw = localStorage.getItem(storeKey(workspaceId)); if (raw) { const list = JSON.parse(raw) as TemplateCard[]; seen.set(workspaceId, list); return list; } } catch { /* read from the server */ }
  return null;
}
export function remember(workspaceId: string, list: TemplateCard[]) {
  seen.set(workspaceId, list);
  try { localStorage.setItem(storeKey(workspaceId), JSON.stringify(list)); } catch { /* the memory one is enough */ }
}
const reading = new Map<string, ReturnType<typeof loadTemplates>>();
/** Reads the templates once at a time per workspace; the app calls it while idle so Discover opens with them there */
export function preloadTemplates(workspaceId: string) {
  const running = reading.get(workspaceId);
  if (running) return running;
  const job = loadTemplates().then((r) => {
    if (r.ok) {
      remember(workspaceId, r.data);
      // Their pictures too: a card's first screen is there when the card is
      for (const tpl of r.data) { const src = posterOf(tpl); if (src) new Image().src = src; }
    }
    return r;
  }).finally(() => reading.delete(workspaceId));
  reading.set(workspaceId, job);
  return job;
}
