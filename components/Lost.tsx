import type { ReactNode } from "react";
import LostTino from "@/components/LostTino";
import LostTheme from "@/components/LostTheme";
import "./Lost.css";

/** A full-page dead end (404, error): Tino floats where the zero of a 404 would be, curious, or alone and sad when
 *  something broke; then one line of why and the ways out as children. */
export default function Lost({ digits = false, title, body, children }: { digits?: boolean; title: string; body: string; children: ReactNode }) {
  return (
    <main className="lost">
      <LostTheme />
      <div className="lost__hero">
        {digits && <span className="lost__digit" aria-hidden>4</span>}
        <LostTino broke={!digits} className="lost__head" />
        {digits && <span className="lost__digit" aria-hidden>4</span>}
      </div>
      <h1 className="lost__title">{title}</h1>
      <p className="lost__body">{body}</p>
      <div className="lost__actions">{children}</div>
    </main>
  );
}
