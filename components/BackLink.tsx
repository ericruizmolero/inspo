"use client";
// Shared "Back" link for secondary pages (/settings…).
// Coming from another app page it goes back in history, to keep filters
// and scroll; reached by direct URL it goes to the fixed destination.
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useT } from "./I18nProvider";

interface Props { href?: string; label?: string }

export default function BackLink({ href = "/", label }: Props) {
  const router = useRouter();
  const { t } = useT();
  const text = label ?? t.common.back;

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    let sameOrigin = false;
    try { sameOrigin = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch { /* opaque referrer */ }
    if (sameOrigin && window.history.length > 1) { e.preventDefault(); router.back(); }
  };

  return (
    <Link href={href} className="back" onClick={onClick} aria-label={t.common.backToLibrary}>
      <span className="back__icon" aria-hidden>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7.5 2.5L4 6l3.5 3.5" />
        </svg>
      </span>
      <span className="back__label">{text}</span>
    </Link>
  );
}
