import type { ReactNode } from "react";
import Logo from "@/components/Logo";
import LostTheme from "@/components/LostTheme";
import "./Lost.css";

/** A full-page dead end (404, error): the mark floats where the zero of a 404 would be, or alone and askew when something broke; then one line of why and the ways out as children. */
export default function Lost({ digits = false, title, body, children }: { digits?: boolean; title: string; body: string; children: ReactNode }) {
  return (
    <main className="lost">
      <LostTheme />
      <div className={`lost__hero${digits ? "" : " lost__hero--askew"}`}>
        {digits && <span className="display lost__digit" aria-hidden>4</span>}
        <Logo size={128} className="lost__head" />
        {digits && <span className="display lost__digit" aria-hidden>4</span>}
      </div>
      <h1 className="display lost__title">{title}</h1>
      <p className="lost__body">{body}</p>
      <div className="lost__actions">{children}</div>
    </main>
  );
}
