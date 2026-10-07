"use client";
// Bringing in a brand that already exists, three ways: its website (measured, then read), its files (logos, fonts,
// pictures, a PDF guide) or the text of its guidelines. What comes in is a starting point: the next passes read it
// with the board and keep improving it; only what the team edits by hand stays fixed.
import { useState } from "react";
import { useT } from "../I18nProvider";
import { Dialog, DialogDescription, DialogWindow } from "@/components/ui/dialog";
import { Busy, Button, Icon, IconButton, SegmentedControl, TextArea } from "@/components/criterio";
import type { InspoItem } from "@/types/inspo";
import { brandId, type BrandFace, type BrandFile, type BrandSections, type BrandSpec } from "@/types/brand";
import type { ProjectSystem } from "@/types/system";
import { seedBrandFromClient } from "@/app/actions/brand";
import { familyBase, familyKey, weightInName } from "@/lib/font-names";
import { uploadBrandFile } from "./upload";
import type { UploadPurpose } from "./context";

type Tab = "site" | "files" | "text";
type Step = { label: string; state: "wait" | "run" | "done" | "fail" };

interface Props {
  projectId: string;
  brand: BrandSpec;
  onClose: () => void;
  onAddSite?: (web: string) => Promise<InspoItem | null>;
  onClient?: (itemId: string | null) => Promise<void>;
  onSystem: (s: ProjectSystem) => void;
  /** Both passes, the system's and then the brand's */
  onRun: () => Promise<void>;
  save: <K extends keyof BrandSections>(section: K, value: BrandSections[K]) => void;
  initial?: Tab;
}

const ext = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
const isFont = (n: string) => ["woff2", "woff", "otf", "ttf"].includes(ext(n));
const isPic = (n: string) => ["svg", "png", "webp", "jpg", "jpeg"].includes(ext(n));
/** A file named like a logo goes to the logo; "mark", "symbol", "icon" to the mark; "white", "negative" to the dark ground */
const LOGO = /logo|wordmark|lockup|mark|symbol|isotipo|imagotipo|logotipo|icon|favicon|brand/i;
const MARK = /mark|symbol|isotipo|icon|favicon|monogram|glyph|simbolo|símbolo/i;
const DARK = /white|inverse|inverted|negative|neg\b|reversed|dark|blanco|negativo|on-?black/i;

export default function BrandImport({ projectId, brand, onClose, onAddSite, onClient, onSystem, onRun, save, initial = "site" }: Props) {
  const { t } = useT();
  const s = t.brand.import;
  const [tab, setTab] = useState<Tab>(initial);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const track = async <T,>(i: number, fn: () => Promise<T>): Promise<T> => {
    setSteps((x) => x.map((st, j) => (j === i ? { ...st, state: "run" } : st)));
    try { const v = await fn(); setSteps((x) => x.map((st, j) => (j === i ? { ...st, state: "done" } : st))); return v; }
    catch (e) { setSteps((x) => x.map((st, j) => (j === i ? { ...st, state: "fail" } : st))); throw e; }
  };
  const go = async (labels: string[], job: () => Promise<void>) => {
    setBusy(true); setError(""); setSteps(labels.map((label) => ({ label, state: "wait" })));
    try { await job(); onClose(); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };

  const fromSite = () => go([s.steps.save, s.steps.measure, s.steps.seed, s.steps.read], async () => {
    let web = url.trim();
    if (!/^https?:\/\//i.test(web)) web = `https://${web}`;
    const item = await track(0, async () => { const it = await onAddSite?.(web); if (!it?.id) throw new Error(t.errors.badUrl); await onClient?.(it.id); return it; });
    await track(1, async () => {
      const res = await fetch(`/api/design-md?url=${encodeURIComponent(item.web)}`);
      if (!res.ok) { const j = await res.json().catch(() => ({})) as { error?: string }; throw new Error(j.error || s.measureFailed); }
    });
    await track(2, async () => { const r = await seedBrandFromClient(projectId); if (!r.ok) throw new Error(r.error); onSystem(r.data); });
    await track(3, onRun);
  });

  const fromText = () => go([s.steps.keep, s.steps.read], async () => {
    await track(0, async () => {
      const res = await fetch("/api/system/brand/import-text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, text }) });
      const json = await res.json().catch(() => ({})) as ProjectSystem & { error?: string };
      if (!res.ok || json.error) throw new Error(json.error || s.failed);
      onSystem(json);
    });
    await track(1, onRun);
  });

  const fromFiles = () => go(files.map((f) => f.name), async () => {
    const logo = { ...brand.logo, primary: { ...brand.logo.primary }, mark: { ...brand.logo.mark } };
    const faces: BrandFace[] = brand.typography.faces.map((f) => ({ ...f, files: [...(f.files ?? [])] }));
    const pictures = [...brand.imagery.files];
    const assets = [...brand.assets.files];
    const touched = new Set<keyof BrandSections>();
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const purpose: UploadPurpose = isFont(f.name) ? "font" : isPic(f.name) ? (LOGO.test(f.name) || ext(f.name) === "svg" ? "logo" : "image") : "file";
      const got: BrandFile = await track(i, () => uploadBrandFile(projectId, f, purpose));
      if (purpose === "logo") {
        const pair = MARK.test(f.name) ? logo.mark : logo.primary;
        pair[DARK.test(f.name) ? "dark" : "light"] = got; touched.add("logo");
      } else if (purpose === "font") {
        const base = familyBase(f.name.replace(/\.[a-z0-9]+$/i, "")) || f.name;
        const weight = weightInName(f.name.replace(/\.[a-z0-9]+$/i, "")) ?? 400;
        const style = /italic|oblique/i.test(f.name) ? "italic" as const : "normal" as const;
        let face = faces.find((x) => familyKey(x.family) === familyKey(base));
        if (!face) { face = { id: brandId(), family: base, role: faces.some((x) => x.role === "display") ? "text" : "display", source: "upload", weights: [], files: [], note: "" }; faces.push(face); }
        face.source = "upload";
        face.files = [...(face.files ?? []).filter((x) => !(x.weight === weight && x.style === style)), { weight, style, key: got.key }];
        face.weights = [...new Set([...face.weights, weight])].sort((a, b) => a - b);
        touched.add("typography");
      } else if (purpose === "image") { pictures.push(got); touched.add("imagery"); }
      else { assets.push(got); touched.add("assets"); }
    }
    if (touched.has("logo")) save("logo", logo);
    if (touched.has("typography")) save("typography", { ...brand.typography, faces: faces.slice(0, 4) });
    if (touched.has("imagery")) save("imagery", { ...brand.imagery, files: pictures.slice(0, 9) });
    if (touched.has("assets")) save("assets", { ...brand.assets, files: assets.slice(0, 20) });
  });

  const tabs: Tab[] = ["site", "files", "text"];
  return (
    <Dialog open onOpenChange={(o) => { if (!o && !busy) onClose(); }}>
      <DialogWindow className="bimp" bar={s.open} heading={s.title} closeLabel={t.common.close}>
        <div className="bimp__body">
          <DialogDescription className="bimp__lead">{s.lead}</DialogDescription>
          {/* While it runs the tabs stay put: a press on another one waits for the steps to finish */}
          <SegmentedControl tone="paper" className="bimp__tabs" label={s.title} active={tabs.indexOf(tab)}
            onChange={(i) => { if (!busy) setTab(tabs[i]); }} items={tabs.map((k) => ({ label: s.tabs[k] }))} />
          {steps.length > 0 ? (
            <ol className="bimp__steps" aria-live="polite">
              {steps.map((st, i) => <li key={i} className={`is-${st.state}`}>{st.state === "run" ? <Busy label={st.label} /> : st.state === "done" ? <Icon name="check" size={14} /> : st.state === "fail" ? <Icon name="close" size={14} /> : <i />}<span>{st.label}</span></li>)}
            </ol>
          ) : tab === "site" ? (
            <form className="bimp__form" onSubmit={(e) => { e.preventDefault(); if (url.trim()) void fromSite(); }}>
              <input className="cr-input" type="url" inputMode="url" placeholder="https://" aria-label={s.tabs.site} value={url} onChange={(e) => setUrl(e.currentTarget.value)} autoFocus />
              <p className="bimp__hint">{s.siteHint}</p>
              <Button variant="primary" type="submit" disabled={!url.trim() || busy}>{s.bring}</Button>
            </form>
          ) : tab === "files" ? (
            <div className="bimp__form">
              <label className={`bimp__drop${files.length ? " has-files" : ""}`}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setFiles((x) => [...x, ...Array.from(e.dataTransfer.files)].slice(0, 20)); }}>
                <input type="file" multiple hidden accept=".svg,.png,.webp,.jpg,.jpeg,.woff2,.woff,.otf,.ttf,.pdf" onChange={(e) => { const list = Array.from(e.currentTarget.files ?? []); setFiles((x) => [...x, ...list].slice(0, 20)); e.currentTarget.value = ""; }} />
                {files.length ? <ul>{files.map((f, i) => <li key={i}>{f.name}<IconButton icon="close" variant="quiet" size="xs" onClick={(e) => { e.preventDefault(); setFiles((x) => x.filter((_, j) => j !== i)); }} label={t.brand.remove} /></li>)}</ul> : <span>{s.drop}</span>}
              </label>
              <p className="bimp__hint">{s.filesHint}</p>
              <Button variant="primary" disabled={!files.length || busy} onClick={() => void fromFiles()}>{s.upload(files.length)}</Button>
            </div>
          ) : (
            <form className="bimp__form" onSubmit={(e) => { e.preventDefault(); if (text.trim()) void fromText(); }}>
              <TextArea className="bimp__text" rows={10} value={text} maxLength={60000} placeholder={s.textPlaceholder} aria-label={s.tabs.text} onChange={(e) => setText(e.currentTarget.value)} autoFocus />
              <p className="bimp__hint">{s.textHint}</p>
              <Button variant="primary" type="submit" disabled={text.trim().length < 20 || busy}>{s.read}</Button>
            </form>
          )}
          {error && <p className="sysv-error" role="alert">{error}</p>}
        </div>
      </DialogWindow>
    </Dialog>
  );
}
