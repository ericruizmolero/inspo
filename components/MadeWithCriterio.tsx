"use client";
// The quiet line at the foot of what a team shares with a client (the board at /s, the questions at /a): the marketing
// site in the reader's language, marked ?ref=share. Never the app, and never the share's token.
import { useT } from "./I18nProvider";
import { marketingHref } from "@/lib/site";
import "./MadeWithCriterio.css";

export default function MadeWithCriterio({ className }: { className?: string }) {
  const { locale, t } = useT();
  return (
    <a className={`made-with t-small${className ? ` ${className}` : ""}`} href={`${marketingHref("/", locale)}?ref=share`} target="_blank" rel="noopener">
      {t.madeWith.link}
    </a>
  );
}
