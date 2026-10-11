"use client";

import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { usePathname, type useRouter } from "next/navigation";
import { workspaceOfItem } from "@/app/actions/library";
import { setActiveWorkspace } from "@/components/workspace-switch";
import type { Workspace } from "@/lib/workspace-core";
import { pushUrl, replaceUrl } from "@/lib/url-history";
import type { InspoItem } from "@/types/inspo";

// ─── The panel ──────────────────────────────────────────────────────────────
// The panel opens at once for any reference: the page with its post-its, and its thread.

// Each open reference has its own URL (/i/<id>): it can be shared, and Back closes it.
// The URL changes with history.pushState, which Next syncs with usePathname without a navigation.
export function usePanelRoute({ items, filling, panelItem, setPanelItem, workspace, router }: {
  items: InspoItem[];
  filling: boolean;
  panelItem: InspoItem | null;
  setPanelItem: Dispatch<SetStateAction<InspoItem | null>>;
  workspace: Workspace;
  router: ReturnType<typeof useRouter>;
}) {
  const pushedRef = useRef(false);
  const showPanel = (item: InspoItem) => {
    setPanelItem(item);
    if (item.id && window.location.pathname !== `/i/${item.id}`) {
      // From one open reference to another: replace, so Back goes to the library and not through each one
      if (window.location.pathname.startsWith("/i/")) replaceUrl(`/i/${item.id}${window.location.search}`);
      else { pushUrl(`/i/${item.id}${window.location.search}`); pushedRef.current = true; }
    }
  };
  const closePanel = () => {
    if (!window.location.pathname.startsWith("/i/")) { setPanelItem(null); return; }
    // Opened here: step back, so Back and close do the same. Opened from a shared link: go to the library.
    if (pushedRef.current) { window.history.back(); return; }
    replaceUrl(`/${window.location.search}`);
    setPanelItem(null);
  };
  const panelItemRef = useRef<InspoItem | null>(null);

  /** Opens a reference in the panel */
  const openItem = (item: InspoItem) => showPanel(item);
  panelItemRef.current = panelItem;

  // The path decides what is open: Back or Forward move between the library and a reference,
  // and a shared /i/<id> link opens that reference when the library loads
  const pathname = usePathname();
  const awaitedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = pathname.match(/^\/i\/([^/]+)/)?.[1];
    if (!id) {
      if (panelItemRef.current) { pushedRef.current = false; setPanelItem(null); }
      return;
    }
    if (panelItemRef.current?.id === id) return;
    const item = items.find((i) => i.id === id);
    if (item) { openItem(item); return; }
    // Its page may still be on its way: it opens when it arrives (below)
    if (filling) { awaitedRef.current = id; return; }
    lookElsewhere(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs on path changes only
  }, [pathname]);
  useEffect(() => {
    const id = awaitedRef.current;
    if (!id) return;
    const item = items.find((i) => i.id === id);
    if (!item && filling) return;
    awaitedRef.current = null;
    if (window.location.pathname !== `/i/${id}`) return;
    if (item) openItem(item); else lookElsewhere(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs as the pages arrive
  }, [items, filling]);
  /** Not in this workspace: if it is in another one of mine, switch to it; the library remounts and opens it */
  function lookElsewhere(id: string) {
    workspaceOfItem(id).then(async (r) => {
      if (!r.ok || !r.data || r.data === workspace.id) return;
      await setActiveWorkspace(r.data);
      router.refresh();
    }).catch(() => {});
  }
  return { showPanel, closePanel, openItem, pushedRef };
}
