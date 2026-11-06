"use client";
// A project's board shared by link (app/s/[token], its Board tab): the references in columns, newest first, read
// only. Each card opens its original. What came from X or Pinterest arrives with no picture (lib/share-view.ts,
// staysInside): it is named and linked. In a link that hands out everything, who saved it and their note go under it.
import { useState, type ReactNode } from "react";
import type { BrandRef } from "./context";
import type { SharedCard } from "@/lib/share-view";
import PersonAvatar from "../PersonAvatar";
import { useT } from "../I18nProvider";

/** The site a card comes from; none for a file served through the link itself (a relative address) */
const hostOf = (web: string) => { if (!/^https?:\/\//.test(web)) return ""; try { return new URL(web).hostname.replace(/^www\./, ""); } catch { return ""; } };

function Card({ href, label, className, children }: { href: string | null; label: string; className: string; children: ReactNode }) {
  return href
    ? <a className={className} href={href} target="_blank" rel="noreferrer noopener" aria-label={label}>{children}</a>
    : <div className={className}>{children}</div>;
}

export default function ShareBoard({ board, refs }: { board: SharedCard[]; refs: Record<string, BrandRef> }) {
  const { t } = useT();
  // A picture that does not load leaves its card as words, never as an empty gap
  const [broken, setBroken] = useState<Set<string>>(() => new Set());
  if (!board.length) return <p className="sboard__empty">{t.brand.share.boardEmpty}</p>;
  return (
    <ul className="sboard">
      {board.map((c) => {
        const ref = refs[c.id];
        if (!ref) return null;
        const words = ref.kind === "text" || !ref.image || broken.has(c.id);
        const host = hostOf(ref.web);
        return (
          <li key={c.id} className="sboard__item">
            {/* A pasted text is the reference itself: nothing to open elsewhere */}
            <Card className={`sboard__card${words ? " is-words" : ""}`} href={ref.kind === "text" ? null : ref.web} label={ref.name}>
              {words ? (
                <span className="sboard__words">
                  <b className="sboard__name">{ref.name}</b>
                  {c.text && <span className="sboard__text">{c.text}</span>}
                  {ref.kind !== "text" && host && <small className="sboard__host">{host}</small>}
                </span>
              ) : (
                <img src={ref.image!} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken((b) => new Set(b).add(c.id))} />
              )}
            </Card>
            {c.note && c.by && (
              <p className="tile__note sboard__note">
                <PersonAvatar name={c.by} image={null} size={20} />
                <span className="tile__note-text"><span className="tile__note-who">{c.by}</span> {c.note}</span>
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
