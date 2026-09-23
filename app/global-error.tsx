"use client";
// The root layout itself failed: no I18nProvider or styles, so the language comes from the browser.
import en from "@/lib/i18n/en";
import es from "@/lib/i18n/es";
import { inter } from "./fonts";

export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const t = typeof navigator !== "undefined" && navigator.language.startsWith("es") ? es : en;
  return (
    <html>
      <body className={inter.className} style={{ padding: 32 }}>
        <title>{t.common.errorTitle}</title>
        <h1>{t.common.errorTitle}</h1>
        <p>{t.common.errorBody}</p>
        <button onClick={() => unstable_retry()}>{t.common.retry}</button>
      </body>
    </html>
  );
}
