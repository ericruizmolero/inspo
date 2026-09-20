import localFont from "next/font/local";
import { Schibsted_Grotesk } from "next/font/google";

// ─── Klim test fonts ─────────────────────────────────────────────────────────
// Display: Family (bold). Body: Söhne (Buch / Kräftig).
// Test fonts only ship A-Z a-z 0-9 . , - so anything else (accents, ñ, ¿, :)
// falls through to the next family in the stack. adjustFontFallback is off so
// the fallback is Schibsted Grotesk, not a synthetic Arial.

export const klimDisplay = localFont({
  src: [
    { path: "./fonts/test-family-medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/test-family-bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-klim-display",
  display: "swap",
  adjustFontFallback: false,
});

export const klimBody = localFont({
  src: [
    { path: "./fonts/test-soehne-buch.woff2", weight: "400", style: "normal" },
    { path: "./fonts/test-soehne-kraftig.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-klim-body",
  display: "swap",
  adjustFontFallback: false,
});

// ─── Fallback (glyphs the test fonts lack) ───────────────────────────────────
export const schibsted = Schibsted_Grotesk({
  subsets: ["latin", "latin-ext"],
  variable: "--font-schibsted",
  display: "swap",
});
