"use client";
// Where a file goes: drop it or pick it. Shows the file once it is there, with a way to replace or remove it.
import { useRef, useState, type ReactNode } from "react";
import { useT } from "../../I18nProvider";
import { Busy } from "@/components/criterio";
import { useBrand, type UploadPurpose } from "../context";
import type { BrandFile } from "@/types/brand";

export function FileSlot({ purpose, accept, onFile, onClear, has, children, className = "", label }: {
  purpose: UploadPurpose; accept: string; onFile: (f: BrandFile) => void; onClear?: () => void; has: boolean; children?: ReactNode; className?: string; label?: string;
}) {
  const { t } = useT();
  const { mode, upload } = useBrand();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState("");
  if (mode !== "edit" || !upload) return <>{children}</>;
  const take = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true); setError("");
    try { onFile(await upload(file, purpose)); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <div className={`be-slot${over ? " is-over" : ""}${busy ? " is-busy" : ""}${has ? " has-file" : ""} ${className}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); }}>
      {children}
      <div className="be-slot__bar">
        <button type="button" className="btn btn--sm" onClick={() => input.current?.click()} disabled={busy}>{busy ? <Busy label={t.brand.logo.drop} /> : has ? t.brand.logo.replace : (label ?? t.brand.logo.drop)}</button>
        {has && onClear && <button type="button" className="btn btn--sm" onClick={onClear} disabled={busy}>{t.brand.remove}</button>}
      </div>
      {error && <p className="be-slot__error" role="alert">{error}</p>}
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => { void take(e.currentTarget.files?.[0]); e.currentTarget.value = ""; }} />
    </div>
  );
}
