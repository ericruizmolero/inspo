"use client";
// An empty area is not a dead end. When nothing is filed under an area and nothing is decided, the agent
// looks at the board again for anything that speaks to it, looks through the rest of the library for
// references worth bringing, and asks the one question that gets the area going, with its answers.
// Bringing a reference files it under the area; an answer writes the decision as the team's.
import { useEffect, useState } from "react";
import type { InspoItem } from "@/types/inspo";
import type { SystemArea } from "@/types/system";
import type { AreaStartAsk, AreaStartRefs } from "@/lib/system";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Thumb } from "./SystemStage";

// Two calls per project and area for the life of the page, asked side by side: the references (no model, they
// come at once) and the question (a short model call). Opening the area again shows what was found
const asked = new Map<string, Promise<unknown>>();
function ask<T>(projectId: string, area: SystemArea, part: "refs" | "ask", failed: string): Promise<T> {
  const key = `${projectId}|${area}|${part}`;
  let p = asked.get(key) as Promise<T> | undefined;
  if (!p) {
    p = fetch("/api/system/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, area, part }) })
      .then(async (res) => {
        const json = await res.json().catch(() => ({})) as T & { error?: string };
        if (!res.ok || json.error) throw new Error(json.error || failed);
        return json;
      });
    p.catch(() => asked.delete(key));
    asked.set(key, p);
  }
  return p;
}

/** The references that are ideal for an area, on the board and in the rest of the library: the base the picker
 *  and the starter share. It needs no model, so it is asked for any area that is opened. */
export function useAreaIdeals(projectId: string, area: SystemArea | null): AreaStartRefs | null {
  const [found, setFound] = useState<{ key: string; refs: AreaStartRefs } | null>(null);
  useEffect(() => {
    if (!area) return;
    let alive = true;
    ask<AreaStartRefs>(projectId, area, "refs", "").then((refs) => { if (alive) setFound({ key: `${projectId}|${area}`, refs }); }, () => { /* the picker simply has no suggestions */ });
    return () => { alive = false; };
  }, [projectId, area]);
  return area && found?.key === `${projectId}|${area}` ? found.refs : null;
}

export default function AreaStarter({ projectId, area, areaLabel, inArea, itemOf, imageOf, pending, busy, onAdd, onDecide }: {
  projectId: string; area: SystemArea; areaLabel: string;
  /** Ids already filed under the area: a suggestion taken shows as taken */
  inArea: Set<string>;
  itemOf: (id: string) => InspoItem | undefined;
  imageOf: (item: InspoItem) => string | null;
  pending: Set<string>;
  busy: boolean;
  onAdd: (item: InspoItem) => void;
  onDecide: (decision: string, why: string) => void;
}) {
  const { t } = useT();
  const s = t.system.start;
  const [refs, setRefs] = useState<AreaStartRefs | null>(null);
  const [question, setQuestion] = useState<AreaStartAsk | null>(null);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const [own, setOwn] = useState("");
  useEffect(() => {
    let alive = true;
    setRefs(null); setQuestion(null); setError("");
    const fail = (e: unknown) => { if (alive) setError(e instanceof Error ? e.message : String(e)); };
    ask<AreaStartRefs>(projectId, area, "refs", t.system.failed).then((r) => { if (alive) setRefs(r); }, fail);
    ask<AreaStartAsk>(projectId, area, "ask", t.system.failed).then((r) => { if (alive) setQuestion(r); }, fail);
    return () => { alive = false; };
  }, [projectId, area, round]); // eslint-disable-line react-hooks/exhaustive-deps
  const again = () => { asked.delete(`${projectId}|${area}|refs`); asked.delete(`${projectId}|${area}|ask`); setRound((n) => n + 1); };

  const cards = (list: AreaStartRefs["board"]) => list.map((x) => ({ ...x, item: itemOf(x.itemId) })).filter((x): x is typeof x & { item: InspoItem } => !!x.item).map(({ item, why }) => {
    const on = inArea.has(item.id!);
    return (
      <button key={item.id} type="button" className={`stt-card${on ? " is-on" : ""}${pending.has(item.id!) ? " is-busy" : ""}`} disabled={on} title={on ? s.added : s.add(areaLabel)} onClick={() => onAdd(item)}>
        <Thumb item={item} image={imageOf(item)} className="stt-card__img" />
        <span className="stt-card__name">{item.name}</span>
        <span className="stt-card__why">{why}</span>
        <i className="stt-card__mark">{on ? Icons.check : Icons.plus}</i>
      </button>
    );
  });

  const board = refs ? cards(refs.board) : [], library = refs ? cards(refs.library) : [];
  return (
    <div className="stt">
      {error && <p className="sysv-error" role="alert">{error} <button type="button" className="stt-again" onClick={again}>{s.again}</button></p>}
      {/* The question comes first: it is what the team can answer at once. The references follow under it */}
      {question ? question.options.length > 0 && (
        <section className="stt-group">
          <p className="stt-say">{Icons.spark}<span>{question.say}</span><button type="button" className="stt-again" onClick={again} title={s.again} aria-label={s.again}>{Icons.shuffle}</button></p>
          <h3 className="stt-question">{question.question}</h3>
          <div className="stt-options">
            {question.options.map((o) => (
              <button key={o.label} type="button" className="stt-option" disabled={busy} onClick={() => onDecide(o.decision, o.why)}>
                <b>{o.label}</b>
                <span>{o.decision}</span>
              </button>
            ))}
          </div>
          <form className="stt-own" onSubmit={(e) => { e.preventDefault(); if (own.trim()) onDecide(own.trim(), ""); }}>
            <input className="stt-own__input" value={own} maxLength={400} placeholder={s.ownPlaceholder} aria-label={s.ownPlaceholder} disabled={busy} onChange={(e) => setOwn(e.target.value)} />
            <button type="submit" className="stt-own__go" disabled={busy || !own.trim()}>{Icons.check} {s.use}</button>
          </form>
        </section>
      ) : !error && <p className="stt-say stt-say--loading"><span className="spinner spinner--sm" /> {s.asking(areaLabel)}</p>}

      {refs ? (
        <>
          {board.length > 0 && <section className="stt-group"><h3 className="stt-title">{s.inProject}</h3><div className="stt-cards">{board}</div></section>}
          {library.length > 0 && <section className="stt-group"><h3 className="stt-title">{s.inLibrary}<small>{s.libraryHint}</small></h3><div className="stt-cards">{library}</div></section>}
          {board.length + library.length === 0 && <p className="stt-say stt-say--loading">{s.nothing}</p>}
        </>
      ) : !error && <p className="stt-say stt-say--loading"><span className="spinner spinner--sm" /> {s.loading(areaLabel)}</p>}
    </div>
  );
}
