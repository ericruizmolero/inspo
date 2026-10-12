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

// TRIAL, local only (2026-10-09): Söhne test fonts from Klim, to see Andoni's proposal for text and UI
// next to Satoshi titles. Test Font Licence: internal evaluation only, never shipped, never in git
// (app/fonts/soehne-test/ is ignored). Limited character set (68 glyphs: A-Z a-z 0-9 . , - Öö), so accents and most punctuation fall back to system-ui.
export const soehne = localFont({
  src: [
    { path: "./fonts/soehne-test/test-soehne-buch.woff2", weight: "400", style: "normal" },
    { path: "./fonts/soehne-test/test-soehne-buch-kursiv.woff2", weight: "400", style: "italic" },
    { path: "./fonts/soehne-test/test-soehne-kraftig.woff2", weight: "500", style: "normal" },
    { path: "./fonts/soehne-test/test-soehne-kraftig-kursiv.woff2", weight: "500", style: "italic" },
    { path: "./fonts/soehne-test/test-soehne-halbfett.woff2", weight: "600", style: "normal" },
    { path: "./fonts/soehne-test/test-soehne-halbfett-kursiv.woff2", weight: "600", style: "italic" },
    { path: "./fonts/soehne-test/test-soehne-dreiviertelfett.woff2", weight: "700", style: "normal" },
    { path: "./fonts/soehne-test/test-soehne-dreiviertelfett-kursiv.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-soehne",
  display: "swap",
});
