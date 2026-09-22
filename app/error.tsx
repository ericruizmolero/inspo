"use client";
// Error inesperado al renderizar una página. El layout raíz sigue en pie, así que hay idioma.
import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const { t } = useT();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <div className="page">
      <h1 className="display page__title">{t.common.errorTitle}</h1>
      <p>{t.common.errorBody}</p>
      <p style={{ display: "flex", gap: 8 }}>
        <button className="btn btn--primary" onClick={() => unstable_retry()}>{t.common.retry}</button>
        <Link className="btn" href="/">{t.common.backToLibrary}</Link>
      </p>
    </div>
  );
}
