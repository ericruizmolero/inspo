"use client";
// The system's fourth view: a page built from the project's criterio.md inside the app (lib/criterio-result.ts), the
// first proof of the file. One row picks the page and builds it; under it the latest result, in a sandboxed frame
// with no scripts and no access to the app. The first visit to a project whose system has something decided builds
// the page its board shows most, once, so the file shows what it is worth without a click.
import { useEffect, useMemo, useRef, useState } from "react";
import { Busy, Button, Chip } from "@/components/criterio";
import { timeAgo } from "@/lib/i18n/format";
import type { CriterioResultRow } from "@/lib/criterio-result";
import { useT } from "./I18nProvider";
import "./ResultView.css";

/** The pages a result can be, in the order they are offered (lib/criterio-result.ts RESULT_PAGES) */
const PAGES = ["home", "about", "work-index", "case-study", "article", "pricing", "contact"] as const;

export default function ResultView({ projectId, projectName, filled }: { projectId: string; projectName: string; filled: boolean }) {
  const { t, locale } = useT();
  const r = t.system.result;
  const kinds = t.system.md.composition.kinds as Record<string, string>;
  const [results, setResults] = useState<CriterioResultRow[] | null>(null);
  const [page, setPage] = useState<string>("home");
  const [building, setBuilding] = useState(false);
  const [failed, setFailed] = useState(false);
  const started = useRef(false);

  const build = async (which: string) => {
    setBuilding(true); setFailed(false);
    try {
      const res = await fetch("/api/system/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, page: which }) });
      if (!res.ok) throw new Error(String(res.status));
      const row = (await res.json()) as CriterioResultRow;
      setResults((rs) => [row, ...(rs ?? [])]);
    } catch { setFailed(true); } finally { setBuilding(false); }
  };

  useEffect(() => {
    let live = true;
    void fetch(`/api/system/result?projectId=${encodeURIComponent(projectId)}`).then((res) => res.ok ? res.json() : { results: [], suggested: "home" })
      .then((d: { results: CriterioResultRow[]; suggested: string }) => {
        if (!live) return;
        setResults(d.results);
        setPage(d.results.find((x) => x.status === "done")?.page ?? d.suggested);
        // The first proof comes on its own, once, when there is something decided to follow
        if (!d.results.length && filled && !started.current) { started.current = true; void build(d.suggested); }
      });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per project
  }, [projectId]);

  // The latest finished page of the kind picked
  const shown = useMemo(() => results?.find((x) => x.page === page && x.status === "done") ?? null, [results, page]);
  const open = () => { if (shown) window.open(URL.createObjectURL(new Blob([shown.html], { type: "text/html" })), "_blank", "noopener"); };
  const download = () => {
    if (!shown) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([shown.html], { type: "text/html" }));
    a.download = `${projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${shown.page}.html`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <section className="res" aria-busy={building}>
      <div className="res__bar">
        <div className="pills pills--line" role="group" aria-label={r.tab}>
          {PAGES.map((p) => <Chip key={p} pressed={page === p} onClick={() => setPage(p)} disabled={building}>{kinds[p] ?? p}</Chip>)}
        </div>
        <div className="res__actions">
          {shown && !building && <>
            <Button variant="quiet" size="s" onClick={open}>{r.open}</Button>
            <Button variant="quiet" size="s" onClick={download}>{r.download}</Button>
          </>}
          <Button variant={shown ? "secondary" : "primary"} size="s" onClick={() => void build(page)} disabled={building || !filled} data-tip={r.cost}>{shown ? r.again : r.build}</Button>
        </div>
      </div>
      {shown && !building && <p className="res__meta">{[shown.versionN ? r.from(shown.versionN) : "", shown.byName ?? "", timeAgo(shown.at, locale, t)].filter(Boolean).join(" · ")}</p>}
      {failed && <p className="res__error" role="alert">{r.failed}</p>}
      {building ? (
        <div className="res__frame res__frame--busy"><Busy label={r.building} /><p>{r.building}</p><p className="res__hint">{r.buildingHint}</p></div>
      ) : shown ? (
        // No scripts, no same origin: the page can show itself and nothing else
        <iframe className="res__frame" title={r.frame(kinds[shown.page] ?? shown.page)} sandbox="" srcDoc={shown.html} />
      ) : results ? (
        <div className="res__frame res__frame--empty"><p>{filled ? r.empty : r.needsSystem}</p><p className="res__hint">{r.cost}</p></div>
      ) : null}
    </section>
  );
}
