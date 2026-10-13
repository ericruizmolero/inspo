"use client";
// The system's fourth view: a page built from the project's criterio.md inside the app (lib/criterio-result.ts), the
// first proof of the file. One space to build in: a single question ("What shall we build?") with what the board
// references as shortcuts under it (its kinds of page, a storyboard when it keeps videos), then what was built before
// as a history, and the result picked in a sandboxed frame with no scripts and no access to the app. The first visit to
// a project whose system has something decided builds what its board shows most, once, so the file shows what it is
// worth without a click. While it is built, the frame tells what is read from the file and what the model writes,
// line by line, as the route streams it.
import { useEffect, useMemo, useRef, useState } from "react";
import { Busy, Button, Chip, PromptInput } from "@/components/criterio";
import { timeAgo } from "@/lib/i18n/format";
import type { CriterioResultRow } from "@/lib/criterio-result";
import type { BrandRef } from "./brand/context";
import { useT } from "./I18nProvider";
import "./ResultView.css";

/** lib/criterio-result.ts STORYBOARD and ASK */
const STORYBOARD = "storyboard";
const ASK = "ask:";

export default function ResultView({ projectId, projectName, filled, refs }: {
  projectId: string; projectName: string; filled: boolean;
  /** The board's references by id, to draw the ones handed to the model while it builds */
  refs: Record<string, BrandRef>;
}) {
  const { t, locale } = useT();
  const r = t.system.result;
  const kinds = t.system.md.composition.kinds as Record<string, string>;
  const [results, setResults] = useState<CriterioResultRow[] | null>(null);
  // The result in the frame (its id), and what is being built
  const [picked, setPicked] = useState<string | null>(null);
  const [page, setPage] = useState<string>("home");
  const [building, setBuilding] = useState(false);
  const [failed, setFailed] = useState(false);
  const [offered, setOffered] = useState<string[] | null>(null);
  const [ask, setAsk] = useState("");
  // What is being read and written, oldest first
  const [log, setLog] = useState<{ kind: "read" | "write"; text: string; refs?: string[] }[]>([]);
  const started = useRef(false);
  // The references whose picture does not load: their name instead
  const [broken, setBroken] = useState<Set<string>>(new Set());

  const build = async (which: string, auto = false) => {
    setBuilding(true); setFailed(false); setLog([]); setPage(which);
    try {
      const res = await fetch("/api/system/result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, page: which, auto }) });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let row: CriterioResultRow | null = null;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as { t: "read" | "write" | "done" | "error"; text?: string; refs?: string[]; result?: CriterioResultRow };
          if (e.t === "read" || e.t === "write") setLog((l) => [...l, { kind: e.t as "read" | "write", text: e.text ?? "", refs: e.refs }]);
          else if (e.t === "done") row = e.result ?? null;
          else throw new Error("failed");
        }
      }
      if (!row) throw new Error("no result");
      setResults((rs) => [row!, ...(rs ?? [])]);
      setPicked(row.id);
      setAsk("");
    } catch { setFailed(true); } finally { setBuilding(false); }
  };

  useEffect(() => {
    let live = true;
    void fetch(`/api/system/result?projectId=${encodeURIComponent(projectId)}`).then((res) => res.ok ? res.json() : { results: [], offered: ["home"] })
      .then((d: { results: CriterioResultRow[]; offered: string[] }) => {
        if (!live) return;
        setResults(d.results);
        setOffered(d.offered);
      });
    return () => { live = false; };
  }, [projectId]);

  // The first proof comes on its own, once, when the project has none and something decided to follow. The system
  // may still be loading when the results arrive, so this waits for both
  useEffect(() => {
    if (started.current || !filled || !results || results.length || !offered) return;
    started.current = true;
    void build(offered[0], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- build is stable enough: it only reads props and setters
  }, [filled, results, offered]);

  const label = (p: string) => p === STORYBOARD ? r.storyboard : p.startsWith(ASK) ? p.slice(ASK.length) : kinds[p] ?? p;
  // A shortcut's words sent as they are build that shortcut; anything else is asked in words
  const keyOf = (text: string) => (offered ?? []).find((p) => label(p) === text.trim()) ?? `${ASK}${text.trim()}`;
  const done = useMemo(() => (results ?? []).filter((x) => x.status === "done"), [results]);
  // The history: the latest of each thing built, newest first
  const history = useMemo(() => done.filter((x, i) => done.findIndex((y) => y.page === x.page) === i), [done]);
  const shown = useMemo(() => done.find((x) => x.id === picked) ?? done[0] ?? null, [done, picked]);
  const storyboard = page === STORYBOARD;
  const open = () => { if (shown) window.open(URL.createObjectURL(new Blob([shown.html], { type: "text/html" })), "_blank", "noopener"); };
  const download = () => {
    if (!shown) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([shown.html], { type: "text/html" }));
    a.download = `${`${projectName}-${shown.page.replace(ASK, "")}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 80)}.html`;
    a.click(); URL.revokeObjectURL(a.href);
  };

  // The references handed to the model so far, in the order it got them, each once
  const fed = useMemo(() => [...new Set(log.flatMap((l) => l.refs ?? []))].map((id) => refs[id]).filter((x): x is BrandRef => !!x), [log, refs]);
  const latest = new Set(log.findLast((l) => l.refs?.length)?.refs ?? []);

  return (
    <section className="res" aria-busy={building}>
      {/* The index of the other views, in the same place: here, what was built before */}
      <nav className="res-toc" aria-label={r.history}>
        {history.length > 0 && <p className="res-toc__label">{r.history}</p>}
        <ol>
          {history.map((x) => (
            <li key={x.id}>
              <button type="button" className={shown?.id === x.id ? "is-on" : ""} aria-current={shown?.id === x.id ? "true" : undefined} onClick={() => setPicked(x.id)} disabled={building} title={label(x.page)}>
                {label(x.page)}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <div className="res__main">
        <PromptInput className="res__prompt" id="res-ask" label={r.ask} placeholder={r.askPlaceholder} sendLabel={r.build} value={ask} onChange={setAsk}
          onSubmit={(v) => { if (filled && !building) void build(keyOf(v)); }} disabled={building || !filled} busy={building}
          inputProps={{ maxLength: 200, "aria-describedby": "res-cost" }}
          below={
            <div className="res__below">
              <div className="res__shortcuts" role="group" aria-label={r.suggested}>
                {(offered ?? []).map((p) => <Chip key={p} onClick={() => setAsk(label(p))} disabled={building || !filled}>{label(p)}</Chip>)}
              </div>
              <span id="res-cost">{filled ? r.cost : r.needsSystem}</span>
            </div>
          } />
        {failed && <p className="res__error" role="alert">{r.failed}</p>}
        {shown && !building && (
          <div className="res__bar">
            <p className="res__meta">{[label(shown.page), shown.versionN ? r.from(shown.versionN) : "", shown.byName ?? "", timeAgo(shown.at, locale, t)].filter(Boolean).join(" · ")}</p>
            <div className="res__actions">
              <Button variant="quiet" size="s" onClick={open}>{r.open}</Button>
              <Button variant="quiet" size="s" onClick={download}>{r.download}</Button>
              <Button variant="secondary" size="s" onClick={() => void build(shown.page)} disabled={!filled} data-tip={r.cost}>{r.again}</Button>
            </div>
          </div>
        )}
        {building ? (
          <div className="res__frame res__frame--busy">
            <div className="res__head"><Busy label={storyboard ? r.buildingStoryboard : r.building} /><p>{storyboard ? r.buildingStoryboard : r.building}</p></div>
            {/* What the model is given, as it is given: the board's references, the ones of the step being read lit */}
            {fed.length > 0 && (
              <ul className="res__refs" aria-label={r.fed(fed.length)}>
                {fed.map((x) => (
                  <li key={x.id} className={latest.has(x.id) ? "is-now" : ""} title={x.name}>
                    {x.image && !broken.has(x.id) ? <img src={x.image} alt="" loading="lazy" onError={() => setBroken((m) => new Set(m).add(x.id))} /> : <span>{x.name}</span>}
                  </li>
                ))}
              </ul>
            )}
            {/* The latest line is the one being done; the ones before it fade, the reading in quiet, the writing in ink */}
            <ol className="res__log" aria-live="polite">
              {log.slice(-6).map((l, i, all) => <li key={`${log.length - all.length + i}`} className={`res__step is-${l.kind}${i === all.length - 1 ? " is-now" : ""}`}>{l.text}</li>)}
            </ol>
            <p className="res__hint">{r.buildingHint}</p>
          </div>
        ) : shown ? (
          // No scripts, no same origin: the page can show itself and nothing else
          <iframe className="res__frame" title={r.frame(label(shown.page))} sandbox="" srcDoc={shown.html} />
        ) : null}
      </div>
    </section>
  );
}
