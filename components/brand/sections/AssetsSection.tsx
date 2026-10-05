"use client";
// What someone takes away: the logo files, the tokens in the formats a project uses, criterio.md for an agent, and
// everything in one zip. The tokens are made here from the same values the page shows, so they never drift.
import { useT } from "../../I18nProvider";
import { useBrand } from "../context";
import { useSection } from "../BrandPresentation";
import { FileSlot } from "../edit/FileSlot";
import { fileStem, fontLinks, tailwindTheme, tokensCss, tokensJson } from "@/lib/brand-export";
import type { BrandFile } from "@/types/brand";

function save(text: string, name: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const ext = (f: BrandFile) => (f.type === "image/svg+xml" ? "svg" : f.type.split("/")[1] ?? "bin");

export default function AssetsSection() {
  const { t } = useT();
  const { spec, name, fileSrc, mode, markdown, zipHref } = useBrand();
  const [assets, set] = useSection("assets");
  const s = t.brand.assets;
  const stem = fileStem(name);
  const logos: [string, BrandFile | null][] = [
    [`${t.brand.logo.primary} · ${t.brand.logo.light}`, spec.logo.primary.light], [`${t.brand.logo.primary} · ${t.brand.logo.dark}`, spec.logo.primary.dark],
    [`${t.brand.logo.mark} · ${t.brand.logo.light}`, spec.logo.mark.light], [`${t.brand.logo.mark} · ${t.brand.logo.dark}`, spec.logo.mark.dark],
  ];
  const fonts = fontLinks(spec);
  const row = (label: string, meta: string, action: React.ReactNode) => (
    <li key={`${label}|${meta}`} className="bas-row"><span className="bas-row__label">{label}</span><span className="bas-row__meta">{meta}</span>{action}</li>
  );
  const dl = (onClick: () => void) => <button type="button" className="bas-dl" onClick={onClick}>{s.download}</button>;
  const link = (href: string, file: string) => <a className="bas-dl" href={href} download={file}>{s.download}</a>;
  return (
    <div className="bas">
      {zipHref && <a className="bas-zip" href={zipHref}>{s.zip}<span aria-hidden>↓</span></a>}
      <div className="bas-cols">
        <div>
          <h3 className="brand-k">{s.tokens}</h3>
          <ul className="bas-list">
            {row(s.css, `${stem}-tokens.css`, dl(() => save(tokensCss(spec, name), `${stem}-tokens.css`, "text/css")))}
            {row(s.tailwind, `${stem}-tailwind.css`, dl(() => save(tailwindTheme(spec, name), `${stem}-tailwind.css`, "text/css")))}
            {row(s.json, `${stem}-tokens.json`, dl(() => save(tokensJson(spec), `${stem}-tokens.json`, "application/json")))}
          </ul>
          <h3 className="brand-k">{s.file}</h3>
          <ul className="bas-list">
            {row(s.md, `${stem}-criterio.md`, dl(() => save(markdown, `${stem}-criterio.md`, "text/markdown")))}
          </ul>
        </div>
        <div>
          <h3 className="brand-k">{s.logo}</h3>
          <ul className="bas-list">
            {logos.filter(([, f]) => f).map(([label, f]) => row(label, ext(f!).toUpperCase(), link(fileSrc(f!.key), `${stem}-${tokenish(label)}.${ext(f!)}`)))}
            {assets.files.map((f) => row(f.name ?? f.key.split("/").pop()!, ext(f).toUpperCase(), <span className="bas-row__end">{link(fileSrc(f.key), f.name ?? `${stem}.${ext(f)}`)}{mode === "edit" && <button type="button" className="bas-x" onClick={() => set({ files: assets.files.filter((x) => x.key !== f.key) })} aria-label={t.brand.remove}>×</button>}</span>))}
          </ul>
          {mode === "edit" && <FileSlot purpose="file" accept="image/svg+xml,image/png,image/webp,image/jpeg,application/pdf" has={false} onFile={(f) => set({ files: [...assets.files, f].slice(0, 20) })} className="bas-upload" />}
          {fonts.length > 0 && (
            <>
              <h3 className="brand-k">{t.brand.sections.typography}</h3>
              <ul className="bas-list">
                {fonts.map((f) => row(f.family, t.brand.type.sources[f.note as keyof typeof t.brand.type.sources] ?? f.note, f.href ? <a className="bas-dl" href={f.href} target="_blank" rel="noreferrer">↗</a> : <span />))}
              </ul>
              <p className="brand-hint">{s.fontsLinks}</p>
              {mode === "edit" && spec.typography.faces.some((f) => f.files?.length) && (
                <label className="bas-check"><input type="checkbox" checked={assets.includeFonts} onChange={(e) => set({ includeFonts: e.currentTarget.checked })} /> {s.fontsIncluded}</label>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const tokenish = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
