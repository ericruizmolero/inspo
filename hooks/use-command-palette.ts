"use client";

import { useEffect, useState } from "react";

// Cmd+K (Ctrl+K) opens the command palette from anywhere in the library
export function useCommandPalette() {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Mounted on its first ⌘K, then kept so it can animate closed
  const [paletteUsed, setPaletteUsed] = useState(false);
  if (paletteOpen && !paletteUsed) setPaletteUsed(true);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPaletteOpen((o) => !o); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { paletteOpen, setPaletteOpen, paletteUsed };
}
