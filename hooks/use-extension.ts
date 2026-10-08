"use client";

import { useCallback, useEffect, useState } from "react";

// Messages between the page and extension/chrome/content.js (same tab, same origin), which runs
// on every page of the app.
const FROM_PAGE = "criterio";
const FROM_EXT = "criterio-ext";

export interface ExtensionInfo {
  /** The installed version; null from builds older than 0.2.2, which did not say */
  version: string | null;
  /** It already holds a key */
  connected: boolean;
}

export interface KeyHandover { key: string; workspace: { id: string; name: string; kind: string } }

/** The extension in this browser: whether it is there, and a way to hand it a key. */
export function useExtension() {
  // null: not heard from (not installed, or installed after this tab loaded)
  const [info, setInfo] = useState<ExtensionInfo | null>(null);
  const [received, setReceived] = useState(false);

  // The extension announces it is listening and confirms when it saves the key
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.source !== FROM_EXT) return;
      if (e.data.type === "ext-hello") setInfo({ version: typeof e.data.version === "string" ? e.data.version : null, connected: !!e.data.connected });
      if (e.data.type === "ext-key-received") setReceived(true);
    };
    window.addEventListener("message", onMessage);
    window.postMessage({ source: FROM_PAGE, type: "page-hello" }, window.location.origin);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const handKey = useCallback(({ key, workspace }: KeyHandover) => {
    window.postMessage({ source: FROM_PAGE, type: "ext-key", key, base: window.location.origin, workspace }, window.location.origin);
  }, []);

  return { info, received, handKey };
}

/** The first version whose import page the app can open (content.js "open-import") */
export const OPENS_IMPORT_FROM = "0.7.1";

/** Asks the extension to open its import page on X or on the browser's bookmarks, in a tab next to this one */
export function openExtensionImport(what: "x" | "browser") {
  window.postMessage({ source: FROM_PAGE, type: "open-import", what }, window.location.origin);
}

// The extension answers within a few milliseconds of the page loading; past this it is not there
const ABSENT_AFTER_MS = 1500;

/**
 * What this browser still lacks to save from any site: "install" (no extension), "connect" (it is
 * there without a key), or null (nothing, not known yet, or a browser that cannot run it).
 */
export function useExtensionMissing(): "install" | "connect" | null {
  const { info } = useExtension();
  const [absent, setAbsent] = useState(false);
  useEffect(() => {
    if (!canInstall()) return;
    const id = setTimeout(() => setAbsent(true), ABSENT_AFTER_MS);
    return () => clearTimeout(id);
  }, []);
  if (info) return info.connected ? null : "connect";
  return absent ? "install" : null;
}

/** A default name for this browser's key */
export function browserName(fallback: string): string {
  const ua = navigator.userAgent;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Arc\//.test(ua)) return "Arc";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return fallback;
}

/** Extensions load in Chromium browsers on a computer; Safari, Firefox and phones are out for now */
export function canInstall(): boolean {
  const ua = navigator.userAgent;
  return /Chrome\//.test(ua) && !/Mobi|Android/.test(ua);
}

/** "0.2.10" is newer than "0.2.9": compared number by number */
export function isOlder(version: string, than: string): boolean {
  const a = version.split(".").map(Number), b = than.split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d) return d < 0;
  }
  return false;
}
