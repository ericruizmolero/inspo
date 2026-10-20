"use client";

import { useEffect, useState } from "react";

// Cmd+K (Ctrl+K) opens the command palette from anywhere in the library. A view whose own box answers to it passes
// that box (`field`, a selector): there ⌘K takes the box and, pressed again in it, lets go, as the board's search does
export function useCommandPalette(field: string | null = null) {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Mounted on its first ⌘K, then kept so it can animate closed
  const [paletteUsed, setPaletteUsed] = useState(false);
  if (paletteOpen && !paletteUsed) setPaletteUsed(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      // Typing in a dialog over the view (the palette itself, Add) keeps ⌘K for the palette
      const box = field && !(e.target as HTMLElement | null)?.closest("[role='dialog']") ? document.querySelector<HTMLElement>(field) : null;
      if (!box) { setPaletteOpen((o) => !o); return; }
      if (document.activeElement === box) box.blur(); else box.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [field]);
  return { paletteOpen, setPaletteOpen, paletteUsed };
}
