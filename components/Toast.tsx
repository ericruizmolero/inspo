"use client";

import { IconButton } from "@/components/criterio";
import { useT } from "./I18nProvider";

/** A notice up top: what failed, or (ok) what an import brought */
export type ToastNote = { title: string; detail: string; ok?: boolean };

export default function Toast({ toast, onClose }: { toast: ToastNote; onClose: () => void }) {
  // Uncompiled, as it was inside InspoClient (which the React Compiler skips): the same renders and closures
  "use no memo";
  const { t } = useT();
  return (
    <div className="toasts toasts--top" role="alert">
      {/* A small paper window (the TipWindow's ground, ink border and bevel): the red dot, what failed, and close */}
      <div className={`cr-window toast${toast.ok ? "" : " toast--error"}`} onClick={onClose}>
        <span className="toast__dot" aria-hidden />
        <span className="toast__text"><span className="toast__title">{toast.title}</span><span className="toast__sub">{toast.detail}</span></span>
        <IconButton icon="close" variant="strong" size="xs" label={t.toast.dismiss} onClick={(e) => { e.stopPropagation(); onClose(); }} />
      </div>
    </div>
  );
}
