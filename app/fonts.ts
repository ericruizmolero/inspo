import localFont from "next/font/local";

// Two families from the Criterio design system: Geist Serif for titles (Eric, 04-11), Geist for running text, UI,
// tabs, buttons, inputs and labels. Both are under the SIL Open Font License, so the files live in git next to this
// one (app/fonts/geist and app/fonts/geist-serif, each with its licence).
export const geist = localFont({
  src: [
    { path: "./fonts/geist/Geist-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/geist/Geist-VariableItalic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-geist",
  display: "swap",
});

// Geist Serif comes in one weight: titles use it at 400 and the browser never draws a fake bold (globals.css)
export const geistSerif = localFont({
  src: [{ path: "./fonts/geist-serif/GeistSerif-Regular.woff2", weight: "400", style: "normal" }],
  variable: "--font-geist-serif",
  display: "swap",
});
