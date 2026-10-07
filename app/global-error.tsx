"use client";
// The root layout itself failed: no I18nProvider or styles, so the language comes from the browser.
import { archivo } from "./fonts";

// The three strings it needs, copied from common in lib/i18n/*/ui.ts: importing the dictionaries
// would put both, whole, in the bundle every page loads
const TEXT = {
  en: { errorTitle: "Something broke", errorBody: "This page didn't load. Try again in a moment.", retry: "Try again" },
  es: { errorTitle: "Algo se ha roto", errorBody: "Esta página no ha cargado. Vuelve a intentarlo en un momento.", retry: "Volver a intentarlo" },
};

export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const t = typeof navigator !== "undefined" && navigator.language.startsWith("es") ? TEXT.es : TEXT.en;
  return (
    <html>
      <body className={archivo.className} style={{ padding: 32 }}>
        <title>{t.errorTitle}</title>
        <h1>{t.errorTitle}</h1>
        <p>{t.errorBody}</p>
        <button onClick={() => unstable_retry()}>{t.retry}</button>
      </body>
    </html>
  );
}
