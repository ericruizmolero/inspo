"use client";
import { useLayoutEffect } from "react";
import { readThemePref, resolveTheme } from "@/lib/theme";

/** A thrown 404 or error is rendered whole in the browser, where the boot script in <head> never runs: the theme is set here, before the first paint. */
export default function LostTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!root.dataset.theme) root.dataset.theme = resolveTheme(readThemePref());
  }, []);
  return null;
}
