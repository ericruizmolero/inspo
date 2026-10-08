import localFont from "next/font/local";

// One family, from the Criterio design system: Satoshi for titles, running text, UI, tabs, buttons,
// inputs and labels. Hierarchy comes from size and weight. The files are self-hosted but not in git
// (ITF Free Font License, public repo): scripts/fetch-fonts.mjs downloads them before dev and build.
export const satoshi = localFont({
  src: [
    { path: "./fonts/satoshi/Satoshi-Variable.woff2", weight: "300 900", style: "normal" },
    { path: "./fonts/satoshi/Satoshi-VariableItalic.woff2", weight: "300 900", style: "italic" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});
