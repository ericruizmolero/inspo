import { Archivo, Bricolage_Grotesque } from "next/font/google";

// Two families, from the Criterio design system. Archivo is the calm base: running text, UI, tabs,
// buttons, inputs. Bricolage Grotesque is the playful layer: headlines, titles, the wordmark. Never
// below 16 px and never for running text. No third typeface.
export const archivo = Archivo({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

export const bricolage = Bricolage_Grotesque({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  variable: "--font-bricolage",
  display: "swap",
});
