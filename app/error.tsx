"use client";
// Unexpected error rendering a page. The root layout still stands, so the language is available.
import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { Button, buttonVariants } from "@/components/ui/button";
import Lost from "@/components/Lost";

export default function Error({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  const { t } = useT();
  useEffect(() => { console.error(error); }, [error]);
  return (
    <Lost title={t.common.errorTitle} body={t.common.errorBody}>
      <Button variant="primary" onClick={() => unstable_retry()}>{t.common.retry}</Button>
      <Link className={buttonVariants()} href="/">{t.common.backToLibrary}</Link>
    </Lost>
  );
}
