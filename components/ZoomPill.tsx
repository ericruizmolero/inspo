"use client";
// The pill of the bottom-left corner: the zoom (− % +) in the dock's glass. Out to see more at once, in to look
// closer; the % in the middle goes back to the usual size. The board counts it in columns (components/Grid.tsx)
// and Polish in the size of its tornado (components/PolishView.tsx), which also keeps its sound in the same pill.
import type { ReactNode } from "react";
import { useT } from "./I18nProvider";

export interface ZoomControls {
  pct: number;
  /** What the % stands for where it is not plain (the board's columns) */
  label?: string;
  canOut: boolean;
  canIn: boolean;
  onOut: () => void;
  onIn: () => void;
  onReset: () => void;
}

export default function ZoomPill({ zoom, className, children }: {
  /** Null where there is nothing to zoom right now: the pill keeps only what else it holds */
  zoom: ZoomControls | null;
  className?: string;
  /** What shares the pill with the zoom, after it */
  children?: ReactNode;
}) {
  const { t } = useT();
  return (
    <div className={`zoom-pill${className ? ` ${className}` : ""}`} role="group">
      {zoom && (
        <span className="zoom-pill__zoom">
          <button type="button" className="zoom-pill__btn" aria-label={t.zoom.zoomOut} title={t.zoom.zoomOut} disabled={!zoom.canOut} onClick={zoom.onOut}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>
          <button type="button" className="zoom-pill__pct" aria-label={`${zoom.pct}% · ${zoom.label ? `${zoom.label} · ` : ""}${t.zoom.reset}`} title={t.zoom.reset} onClick={zoom.onReset}>{zoom.pct}%</button>
          <button type="button" className="zoom-pill__btn" aria-label={t.zoom.zoomIn} title={t.zoom.zoomIn} disabled={!zoom.canIn} onClick={zoom.onIn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          </button>
          {children ? <i className="zoom-pill__sep" aria-hidden /> : null}
        </span>
      )}
      {children}
    </div>
  );
}
