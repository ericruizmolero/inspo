"use client";
// A project's board with nothing on it yet: the board itself, empty, and Tino in his corner speaking first (the one
// place he does: an empty board says nothing by itself). He asks what the project is; the dock's field takes a
// sentence (saved as the brief's `about`) or a link (saved here as a reference). A site pasted while the project has
// no client's site gets one question: the one being redesigned, or a reference. Images are dropped or pasted on the
// board as anywhere (hooks/use-add-dialog.ts); the dock's two buttons open the library picker and the add dialog.
// As soon as the board has something, the search and its Tino take over (SearchTino).
import { useState } from "react";
import type { InspoItem, Project } from "@/types/inspo";
import { hostOf, mediaKindOf, normalizeWebUrl } from "@/lib/url";
import { IconButton } from "@/components/criterio";
import { useT } from "./I18nProvider";
import TinoDock, { type DockSay } from "./TinoDock";

export default function BoardStart({ project, hasLibrary, onAddUrl, onAbout, onClient, onAdd, onLibrary, onAgent }: {
  project: Project;
  /** The library has references to bring: the picker is offered */
  hasLibrary: boolean;
  /** Saves (or, already saved, files) the URL in this project; the saved reference, or null when it failed */
  onAddUrl: (web: string) => Promise<InspoItem | null>;
  /** Saves what the project is about; false when it failed */
  onAbout: (about: string) => Promise<boolean>;
  /** Marks a saved reference as the client's current site */
  onClient: (itemId: string) => Promise<void>;
  /** The add dialog: an image, a text, a board */
  onAdd: () => void;
  onLibrary: () => void;
  /** The same setup from the person's own agent: connects it (ConnectDialog) */
  onAgent: () => void;
}) {
  const { t } = useT();
  const s = t.tino.start;
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // A site pasted, waiting to hear what it is to the project
  const [site, setSite] = useState<string | null>(null);

  const add = async (web: string, client: boolean) => {
    setBusy(true); setSite(null);
    try {
      const item = await onAddUrl(web);
      if (!item) { setFailed(true); return; }
      setValue("");
      if (client && item.id) await onClient(item.id);
    } finally { setBusy(false); }
  };
  const submit = async (v: string) => {
    setFailed(false);
    const web = /\s/.test(v) ? null : normalizeWebUrl(v);
    if (web) {
      // Only a site can be the one redesigned, and only while the project has none
      if (mediaKindOf(web) === "web" && !project.clientItemId) setSite(web);
      else await add(web, false);
      return;
    }
    setBusy(true);
    try { if (await onAbout(v)) setValue(""); else setFailed(true); } finally { setBusy(false); }
  };

  const say: DockSay = failed ? { key: "start-failed", title: s.failed, mood: "sad" }
    : site ? {
      key: `start-site:${site}`, title: s.siteTitle, text: s.siteText(hostOf(site)), mood: "suspect",
      options: [
        { key: "redesign", label: s.redesign, onPick: () => void add(site, true) },
        { key: "reference", label: s.reference, onPick: () => void add(site, false) },
      ],
    }
    : project.intent ? { key: "start-refs", title: s.refsTitle, text: s.refsText, mood: "watching" }
    : { key: "start-ask", title: s.askTitle, text: s.askText, mood: "watching", options: [{ key: "agent", label: t.projects.startAgent, onPick: onAgent }] };

  return (
    <TinoDock label={s.label(project.name)} placeholder={s.placeholder} value={value} busy={busy} say={say} scope={`:${project.id}`}
      onChange={(v) => { setValue(v); setFailed(false); setSite(null); }} onSubmit={(v) => void submit(v)}
      actions={<>
        {hasLibrary && <IconButton icon="inbox" variant="quiet" size="s" label={t.projects.startFromLibrary} onClick={onLibrary} />}
        <IconButton icon="plus" variant="quiet" size="s" label={t.gather.add} onClick={onAdd} />
      </>} />
  );
}
