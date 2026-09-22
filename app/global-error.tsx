"use client";
// Falla el propio layout raíz: no hay I18nProvider ni estilos, así que el idioma sale del navegador.
import en from "@/lib/i18n/en";
import es from "@/lib/i18n/es";

export default function GlobalError({ unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const t = typeof navigator !== "undefined" && navigator.language.startsWith("es") ? es : en;
  return (
    <html>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
        <title>{t.common.errorTitle}</title>
        <h1>{t.common.errorTitle}</h1>
        <p>{t.common.errorBody}</p>
        <button onClick={() => unstable_retry()}>{t.common.retry}</button>
      </body>
    </html>
  );
}
