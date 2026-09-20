"use client";

import { useEffect, useState } from "react";
import { stepFor, stepIndex, STEP_COUNT, progressFor } from "./DesignMdModal";
import type { DesignSpec } from "@/types/design";

export interface DesignMdEntry {
  url: string; markdown: string; generatedAt: string; model: string; cached: boolean;
  spec?: DesignSpec; screenshotUrl?: string;
}

export interface DesignMdState {
  status: "loading" | "ready" | "error";
  empresa: string;
  startedAt: number;
  entry?: DesignMdEntry;
  error?: string;
  seen: boolean; // el usuario ya ha visto el resultado (o lo ha descartado)
}

interface DesignMdToastsProps {
  jobs: Record<string, DesignMdState>;
  openUrl: string | null; // URL cuyo modal está abierto ahora mismo
  onOpen: (url: string) => void;
  onDismiss: (url: string) => void;
}

export default function DesignMdToasts({ jobs, openUrl, onOpen, onDismiss }: DesignMdToastsProps) {
  const [, tick] = useState(0);

  const visible = Object.entries(jobs).filter(([url, j]) => url !== openUrl && (j.status === "loading" || !j.seen));
  const anyLoading = visible.some(([, j]) => j.status === "loading");

  useEffect(() => {
    if (!anyLoading) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyLoading]);

  if (!visible.length) return null;

  return (
    <div className="toasts">
      {visible.map(([url, j]) => (
        <div key={url} className={`toast toast--${j.status}`} onClick={() => onOpen(url)} role="button">
          {j.status === "loading" ? <span className="spinner" /> : <span className="toast__dot" />}
          <div className="toast__text">
            <span className="toast__title">DESIGN.md · {j.empresa}</span>
            <span className="toast__sub">
              {j.status === "loading" && <><span className="toast__step">{stepIndex(j.startedAt) + 1}/{STEP_COUNT}</span>{stepFor(j.startedAt)}</>}
              {j.status === "ready" && "Listo. Toca para verlo."}
              {j.status === "error" && (j.error || "Ha fallado")}
            </span>
          </div>
          {j.status === "loading" && (
            <span className="toast__bar"><span style={{ width: `${Math.round(progressFor(j.startedAt) * 100)}%` }} /></span>
          )}
          <button
            className="btn-icon toast__close"
            aria-label="Descartar"
            onClick={(e) => { e.stopPropagation(); onDismiss(url); }}
          >×</button>
        </div>
      ))}
    </div>
  );
}
