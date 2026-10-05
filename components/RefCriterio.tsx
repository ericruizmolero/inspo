"use client";
// One reference's part of criterio.md, in its panel: its entry under References, typed in place as in the system's
// file (it is the same text: saved here, the file changes; changed there, it shows here), and the areas that cite
// it. Each part's heading leads to where it is in the system.
import { useMemo } from "react";
import type { InspoItem, Project } from "@/types/inspo";
import type { ProjectSystem, SystemArea } from "@/types/system";
import { criterioBlocks, refSlice, withRefEntry, type CriterioBlock, type RefInfo } from "@/lib/criterio-md";
import { saveDocPart } from "@/app/actions/system";
import { Editable, Line } from "./SystemMarkdown";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import "./SystemMarkdown.css";
import "./SystemDoc.css";
import "./RefCriterio.css";

export type SystemSpot = { area: SystemArea } | { code: string };

export default function RefCriterio({ item, project, system, library, boardIds, refInfo, onSystem, onGo }: {
  item: InspoItem;
  /** The project whose file it is told in; null when the reference is in none */
  project: Project | null;
  system: ProjectSystem | null;
  /** The whole library: what the file says of each reference cited */
  library: InspoItem[];
  /** The project's references, oldest first: the order of their codes (R1, R2…) */
  boardIds: string[];
  refInfo: (item: InspoItem) => RefInfo;
  onSystem: (projectId: string, system: ProjectSystem) => void;
  /** Opens the system at a part of the file */
  onGo: (projectId: string, spot: SystemSpot) => void;
}) {
  const { t } = useT();
  const c = t.panel.criterio;
  const labels = t.system.areas as Record<SystemArea, string>;
  const code = item.id ? `R${boardIds.indexOf(item.id) + 1}` : "";
  const blocks = useMemo<CriterioBlock[]>(() => (project && system ? criterioBlocks({
    project: project.name, system,
    items: Object.fromEntries(library.filter((i) => i.id).map((i) => [i.id!, refInfo(i)])),
    labels, strings: t.system.md, board: boardIds,
    origin: typeof window === "undefined" ? "" : window.location.origin,
  }) : []), [project, system, library, refInfo, labels, t, boardIds]);
  const slice = useMemo(() => (code && code !== "R0" ? refSlice(blocks, code) : null), [blocks, code]);

  if (!project || !system || !slice || !item.id) return <div className="ip-state"><span>{c.notFiled}</span></div>;
  const id = item.id;
  const refs = blocks.find((b): b is Extract<CriterioBlock, { kind: "section" }> => b.kind === "section" && b.id === "refs")!;
  const save = async (part: string, text: string | null) => {
    const r = await saveDocPart(project.id, part, text);
    if (!r.ok) throw new Error(r.error);
    onSystem(project.id, r.data);
  };
  // References rewritten whole by hand in the system: the entry is written into that text, which is what the file shows
  const onSave = (text: string) => (system.doc?.refs
    ? save("refs", withRefEntry(refs.lines, code, text.split("\n")).join("\n"))
    : save(`ref:${id}`, text));
  const byHand = !system.doc?.refs && !!system.doc?.[`ref:${id}`];
  const head = (label: string, spot: SystemSpot) => (
    <button type="button" className="rfc-head" onClick={() => onGo(project.id, spot)} title={c.see}>
      <span>{label}</span><span className="rfc-see">{c.see} <i aria-hidden>{Icons.arrow}</i></span>
    </button>
  );

  return (
    <div className="rfc">
      <p className="rfc-lead">{c.lead(project.name)}</p>
      <section className="mdv rfc-file" aria-label="criterio.md">
        <div className="mdv-doc">
          {head(c.entry, { code })}
          <Line text={slice.heading} />
          <Line text="" />
          <Editable key={`${project.id}:${id}`} raw={slice.entry.join("\n")} placeholder="" onSave={onSave} onReset={byHand ? () => save(`ref:${id}`, null) : undefined} />
          <Line text="" />
          <div className="rfc-sep" aria-hidden />
          <p className="rfc-label">{c.cited}</p>
          {slice.cited.length ? slice.cited.map((x) => (
            <div key={x.area} className="rfc-cite">
              {head(x.heading, { area: x.area })}
              {x.lines.map((l, i) => <Line key={i} text={l} />)}
            </div>
          )) : <p className="rfc-none">{c.none}</p>}
        </div>
      </section>
    </div>
  );
}
