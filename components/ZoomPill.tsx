"use client";
// The pill of the bottom-left corner: the zoom (− % +) on the chrome (the system's PillBar look, with its ZoomControl inside). Out to see more at once, in to look
// closer; the % in the middle goes back to the usual size. The board counts it in columns (components/Grid.tsx)
// and Polish in the size of its tornado (components/PolishView.tsx), which also keeps its sound in the same pill.
import type { ReactNode } from "react";
import { IconButton } from "@/components/criterio";
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

/** The system's chrome pill (the ZoomControl and PillBar look, app/globals.css .zoom-pill): quiet IconButtons s for
 *  minus and plus, the percentage between them (back to 100%), then a hairline and what shares the pill */
export default function ZoomPill({ zoom, className, children }: {
  /** Null where there is nothing to zoom right now: the pill keeps only what else it holds */
  zoom: ZoomControls | null;
  className?: string;
  /** What shares the pill with the zoom, after it */
  children?: ReactNode;
}) {
  const { t } = useT();
  return (
    <div role="group" aria-label={t.zoom.label} className={`zoom-pill${className ? ` ${className}` : ""}`}>
      {zoom && (
        <span className="zoom-pill__zoom">
          <IconButton icon="minus" variant="quiet" size="s" className="zoom-pill__btn" label={t.zoom.zoomOut} disabled={!zoom.canOut} onClick={zoom.onOut} />
          <button type="button" className="zoom-pill__pct" aria-live="polite" aria-label={`${zoom.pct}%${zoom.label ? `, ${zoom.label}` : ""}. ${t.zoom.reset}`}
            data-tip={t.zoom.reset} onClick={zoom.onReset}>{zoom.pct}%</button>
          <IconButton icon="plus" variant="quiet" size="s" className="zoom-pill__btn" label={t.zoom.zoomIn} disabled={!zoom.canIn} onClick={zoom.onIn} />
          {children ? <i className="zoom-pill__sep" aria-hidden /> : null}
        </span>
      )}
      {children}
    </div>
  );
}
