"use client";
// The first screen inside a workspace: what are you making? Name a project and land on its system,
// empty and waiting; or pick one the team already has. The whole library is one link away.
import { useState } from "react";
import { savePolishBrief } from "@/app/actions/polish";
import type { InspoItem, Project, ProjectLinks } from "@/types/inspo";
import { SYSTEM_AREAS, type ProjectSystem } from "@/types/system";
import { useT } from "./I18nProvider";
import { FillRing, Icons } from "./Sidebar";
import { Button } from "@/components/ui/button";

export default function ProjectChooser({ projects, systems, items, links, onPick, onCreate, onLibrary }: {
  projects: Project[];
  systems: Record<string, ProjectSystem>;
  items: InspoItem[];
  links: ProjectLinks;
  onPick: (id: string) => void;
  onCreate: (name: string) => Promise<Project | null>;
  onLibrary: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState("");
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const counts: Record<string, number> = {};
  for (const i of items) for (const p of (i.id && links[i.id]) || []) counts[p] = (counts[p] ?? 0) + 1;
  const create = async () => {
    const n = name.trim(); if (!n || busy) return;
    setBusy(true);
    try {
      const p = await onCreate(n);
      if (!p) return;
      // The sentence is the project's brief from the first minute: the first reading of the board follows it
      if (about.trim()) await savePolishBrief(p.id, { about: about.trim() }).catch(() => null);
      onPick(p.id);
    } finally { setBusy(false); }
  };
  return (
    <div className="chooser">
      <div className="chooser__inner">
        <span className="sysv-tile__eyebrow">{t.chooser.eyebrow}</span>
        <h1 className="chooser__title">{projects.length ? t.chooser.titleSome : t.chooser.titleNone}</h1>
        <p className="chooser__lead">{t.chooser.lead}</p>
        <form className="chooser__new" onSubmit={(e) => { e.preventDefault(); void create(); }}>
          <input className="input input--lg chooser__input" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.chooser.placeholder} maxLength={60} disabled={busy} autoFocus aria-label={t.chooser.placeholder} />
          <textarea className="input chooser__about" rows={2} value={about} onChange={(e) => setAbout(e.target.value)} placeholder={t.chooser.aboutPlaceholder} maxLength={500} disabled={busy} aria-label={t.chooser.aboutPlaceholder}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void create(); }} />
          <Button variant="primary" type="submit" className="chooser__go" disabled={busy || !name.trim()}>{busy ? <span className="spinner spinner--sm" /> : Icons.arrow} {t.chooser.start}</Button>
        </form>
        {projects.length > 0 && (
          <div className="chooser__list">
            <span className="chooser__section">{t.chooser.existing}</span>
            <div className="chooser__grid">
              {projects.map((p) => {
                const sys = systems[p.id];
                const filled = sys?.areas.filter((a) => a.decision).length ?? 0;
                return (
                  <button key={p.id} type="button" className="chooser__card" onClick={() => onPick(p.id)}>
                    <span className="chooser__card-head"><span className="chooser__card-name">{p.name}</span>{filled > 0 && <FillRing filled={filled} total={SYSTEM_AREAS.length} />}</span>
                    <span className="chooser__card-meta">{t.chooser.refs(counts[p.id] ?? 0)} · {t.system.filled(filled, SYSTEM_AREAS.length)}</span>
                    {sys?.summary && <span className="chooser__card-summary">{sys.summary}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button type="button" className="chooser__library" onClick={onLibrary}>{Icons.all} {t.chooser.library(items.length)}</button>
      </div>
    </div>
  );
}
