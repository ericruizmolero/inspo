"use client";
// A brand shared by link: the presentation read only, with criterio.md beside it to copy or download. The faces load
// through the link, the files too; nothing here needs a session.
import { useState } from "react";
import { useT } from "../I18nProvider";
import BrandPresentation from "./BrandPresentation";
import { useBrandFonts } from "./useBrandFonts";
import type { BrandRef } from "./context";
import { emptyBrand } from "@/types/brand";
import type { ProjectSystem } from "@/types/system";
import { Button } from "@/components/criterio";

const none = () => {};

export default function SharePage({ token, name, system, refs, markdown }: { token: string; name: string; system: ProjectSystem; refs: Record<string, BrandRef>; markdown: string }) {
  const { t } = useT();
  const base = `/s/${token}`;
  const spec = system.brand ?? emptyBrand();
  const fileSrc = (key: string) => `${base}/f/${key}`;
  const fonts = useBrandFonts(spec.typography.faces, fileSrc, async () => {
    const res = await fetch(`${base}/fonts`);
    return res.ok ? ((await res.json()) as { faces: Record<string, { weight: string; style: string; src: string }[]> }).faces : {};
  });
  const [copied, setCopied] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(markdown); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* the download still works */ } };
  const bar = (
    <div className="share-bar">
      <p>{t.brand.share.forAgents}</p>
      <span>
        <Button variant="primary" onClick={() => void copy()}>{copied ? t.brand.color.copied : t.brand.share.copy}</Button>
        <Button href={`${base}/md?download=1`}>{t.brand.share.download}</Button>
      </span>
    </div>
  );
  return (
    <main className="share">
      <BrandPresentation spec={spec} name={name} summary={system.summary} areas={system.areas} mode="view" fileSrc={fileSrc} refs={refs}
        stack={fonts.stack} display={fonts.display} text={fonts.text} markdown={markdown}
        save={none} release={none} saving={new Set()} bar={bar} zipHref={`${base}/download`} />
      <footer className="share-foot"><a href="https://criterio.design" rel="noreferrer">criterio.design</a></footer>
    </main>
  );
}
