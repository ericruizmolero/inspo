import localFont from "next/font/local";

// One family, from the Criterio design system: Geist for titles, running text, UI, tabs, buttons,
// inputs and labels. Hierarchy comes from size and weight. Geist is under the SIL Open Font License,
// so the files live in git next to this one (app/fonts/geist, with the licence).
export const geist = localFont({
  src: [
    { path: "./fonts/geist/Geist-Variable.woff2", weight: "100 900", style: "normal" },
    { path: "./fonts/geist/Geist-VariableItalic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-geist",
  display: "swap",
});
