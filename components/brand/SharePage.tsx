"use client";
// A project shared by link: two tabs, its board (ShareBoard) and its brand (the presentation read only, with
// criterio.md beside it to copy or download). One link for both (Eric, 06-11). The faces load through the link, the
// files too; nothing here needs a session. It opens on the brand when there is one, as the links made before the
// board was shared did, else on the board; ?view= keeps the tab in the address.
import { useState } from "react";
import ShareBoard from "./ShareBoard";
import type { SharedCard } from "@/lib/share-view";
import { useT } from "../I18nProvider";
import BrandPresentation from "./BrandPresentation";
import { useBrandFonts } from "./useBrandFonts";
import type { BrandRef } from "./context";
import { emptyBrand } from "@/types/brand";
import type { ProjectSystem } from "@/types/system";
import { Button, SegmentedControl } from "@/components/criterio";

const none = () => {};

const VIEWS = ["board", "system"] as const;
type View = (typeof VIEWS)[number];

export default function SharePage({ token, name, system, refs, markdown, board, view: first }: { token: string; name: string; system: ProjectSystem; refs: Record<string, BrandRef>; markdown: string; board: SharedCard[]; view: View }) {
  const { t } = useT();
  const [view, setView] = useState<View>(first);
  const pick = (v: View) => {
    setView(v);
    const url = new URL(window.location.href);
    url.searchParams.set("view", v);
    window.history.replaceState(null, "", url);
  };
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
      <header className="share-head">
        <h1 className="share-head__name">{name}</h1>
        <SegmentedControl tone="paper" size="s" label={t.brand.share.views} active={VIEWS.indexOf(view)} onChange={(i) => pick(VIEWS[i])}
          items={[{ icon: "pin", label: t.system.modeBoard, count: board.length || undefined }, { icon: "file-md", label: t.system.modeSystem }]} />
      </header>
      {view === "board" ? <ShareBoard board={board} refs={refs} /> : <BrandPresentation spec={spec} name={name} summary={system.summary} areas={system.areas} mode="view" fileSrc={fileSrc} refs={refs}
        stack={fonts.stack} display={fonts.display} text={fonts.text} markdown={markdown}
        save={none} release={none} saving={new Set()} bar={bar} zipHref={`${base}/download`} />}
      <footer className="share-foot"><a href="https://criterio.design" rel="noreferrer">criterio.design</a></footer>
    </main>
  );
}
