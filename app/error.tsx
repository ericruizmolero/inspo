"use client";
// Unexpected error rendering a page. The root layout still stands, so the language is available.
import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import Logo from "@/components/Logo";

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const { t } = useT();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main className="lost">
      <Logo size={56} />
      <h1 className="display lost__title">{t.common.errorTitle}</h1>
      <p className="lost__body">{t.common.errorBody}</p>
      <div className="lost__actions">
        <Button variant="primary" onClick={() => unstable_retry()}>{t.common.retry}</Button>
        <Link className={buttonVariants({ variant: "ghost" })} href="/">{t.common.backToLibrary}</Link>
      </div>
    </main>
  );
}
