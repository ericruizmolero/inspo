"use client";

// Presence: sends a heartbeat to /api/activity every 20 s while the tab is
// visible, plus one when the area changes, the tab is hidden or it closes.
// Each area opens a new segment, so the /admin panel knows where time is
// spent. The server only adds short gaps between beats (lib/activity.ts),
// so time with the tab in the background doesn't count.
// The board sends no beats of its own (`carried`): its pulse (/api/pulse) carries
// the one `beat()` returns, so an open board makes one periodic request, not two.
import { useCallback, useEffect, useRef } from "react";

const INTERVAL_MS = 20 * 1000;
const newId = () => crypto.randomUUID().replace(/-/g, "").slice(0, 24);

// One visit per app load (tab), shared across pages through sessionStorage
function visitId(): string {
  try {
    const k = "inspo:visit";
    let v = sessionStorage.getItem(k);
    if (!v) { v = newId(); sessionStorage.setItem(k, v); }
    return v;
  } catch { return newId(); }
}

export interface Beat { segmentId: string; visitId: string; area: string; path: string }

export function useActivity(area: string, organizationId?: string | null, opts: { carried?: boolean } = {}): () => Beat | null {
  const orgRef = useRef(organizationId);
  orgRef.current = organizationId;
  const beatRef = useRef<Beat | null>(null);
  const carried = !!opts.carried;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const beat: Beat = { segmentId: newId(), visitId: visitId(), area, path: window.location.pathname };
    beatRef.current = beat;
    const payload = () => JSON.stringify({ ...beat, organizationId: orgRef.current ?? null });

    const ping = () => {
      if (document.visibilityState !== "visible") return;
      fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload(), keepalive: true }).catch(() => {});
    };
    // When the tab closes or hides, sendBeacon gets through even if the page dies
    const flush = () => {
      try { navigator.sendBeacon("/api/activity", new Blob([payload()], { type: "application/json" })); }
      catch { fetch("/api/activity", { method: "POST", body: payload(), keepalive: true }).catch(() => {}); }
    };
    const onVisibility = () => { if (document.visibilityState === "visible") { if (!carried) ping(); } else flush(); };

    ping();
    const t = carried ? undefined : setInterval(ping, INTERVAL_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      flush(); // closes the segment when the area changes
    };
  }, [area, carried]);

  return useCallback(() => beatRef.current, []);
}
