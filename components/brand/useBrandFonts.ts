"use client";
// The brand's faces, loaded for real so every specimen is set in them: Google Fonts and Fontshare by their own
// stylesheets, the client's site by its files (through our origin: sites rarely send CORS headers), uploads by
// theirs. A face nobody serves keeps a fallback stack, and the presentation says so.
import { useEffect, useMemo, useState } from "react";
import type { BrandFace } from "@/types/brand";
import { genericOf } from "@/lib/font-names";

export interface ServedFace { weight: string; style: string; src: string; unicodeRange?: string }

const linked = new Set<string>();
function link(href: string) {
  if (linked.has(href) || typeof document === "undefined") return;
  linked.add(href);
  const el = document.createElement("link");
  el.rel = "stylesheet"; el.href = href;
  document.head.appendChild(el);
}

const added = new Set<string>();
function addFace(family: string, f: ServedFace) {
  const key = `${family}|${f.weight}|${f.style}|${f.src}`;
  if (added.has(key) || typeof FontFace === "undefined") return;
  added.add(key);
  const face = new FontFace(family, `url("${f.src}")`, { weight: f.weight, style: f.style, display: "swap", ...(f.unicodeRange ? { unicodeRange: f.unicodeRange } : {}) });
  face.load().then((loaded) => document.fonts.add(loaded)).catch(() => {});
}

/**
 * Loads the faces and returns each one's CSS stack. `siteFaces` asks the server for the files a site face is
 * served in (the app's route, or the share's); `fileSrc` turns an upload's key into its address.
 */
export function useBrandFonts(faces: BrandFace[], fileSrc: (key: string) => string, siteFaces?: () => Promise<Record<string, ServedFace[]>>) {
  const [served, setServed] = useState<Record<string, ServedFace[]>>({});
  const key = faces.map((f) => `${f.id}:${f.family}:${f.source}:${f.weights.join(".")}:${(f.files ?? []).map((x) => x.key).join(".")}`).join("|");
  useEffect(() => {
    for (const f of faces) {
      const weights = (f.weights.length ? f.weights : [400]).slice().sort((a, b) => a - b);
      if (f.source === "google") link(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@${weights.join(";")}&display=swap`);
      if (f.source === "fontshare" && f.slug) link(`https://api.fontshare.com/v2/css?f[]=${f.slug}@${weights.join(",")}&display=swap`);
      if (f.source === "upload") for (const file of f.files ?? []) addFace(f.family, { weight: String(file.weight), style: file.style, src: fileSrc(file.key) });
    }
    if (siteFaces && faces.some((f) => f.source === "site")) {
      let alive = true;
      siteFaces().then((r) => { if (alive) setServed(r); }).catch(() => {});
      return () => { alive = false; };
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    for (const f of faces) for (const s of served[f.id] ?? []) addFace(f.family, s);
  }, [served, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return useMemo(() => {
    const stacks = new Map(faces.map((f) => [f.id, `"${f.family}", ${genericOf(f.family)}`]));
    const display = faces.find((f) => f.role === "display") ?? faces.find((f) => f.role === "text");
    const text = faces.find((f) => f.role === "text") ?? display;
    const fallback = "'Inter', system-ui, sans-serif";
    return {
      stack: (id: string | undefined) => (id && stacks.get(id)) || fallback,
      display: display ? stacks.get(display.id)! : fallback,
      text: text ? stacks.get(text.id)! : fallback,
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}
