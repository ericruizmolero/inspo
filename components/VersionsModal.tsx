"use client";
// criterio.md's versions (lib/criterio-versions.ts): one each time the file left the app with changes, newest first.
// A row says when, who and how it left (copied, downloaded, read by an AI) and which areas changed; picking one shows
// that file as it was, to copy or download it again. The flat modal, like Improve with AI: one title, no moss bar.
import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button, IconButton } from "@/components/criterio";
import { criterioVersionFile, criterioVersions } from "@/app/actions/system";
import { timeAgo } from "@/lib/i18n/format";
import type { CriterioVersionRow } from "@/lib/criterio-versions";
import type { SystemArea } from "@/types/system";
import { useT } from "./I18nProvider";
import "./VersionsModal.css";

export default function VersionsModal({ projectId, projectName, onClose }: { projectId: string; projectName: string; onClose: () => void }) {
  const { t, locale } = useT();
  const s = t.system.mdView.versions;
  const [rows, setRows] = useState<CriterioVersionRow[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [file, setFile] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void criterioVersions(projectId).then((r) => {
      const list = r.ok ? r.data : [];
      setRows(list);
      if (list.length) setPicked(list[0].n);
    });
  }, [projectId]);

  useEffect(() => {
    if (picked === null) return;
    setFile(null);
    setCopied(false);
    void criterioVersionFile(projectId, picked).then((r) => setFile(r.ok ? r.data : null));
  }, [projectId, picked]);

  const how = (via: string) => via === "copy" ? s.via.copy : via === "download" ? s.via.download : via === "result" ? s.via.result : s.via.mcp(via.replace(/^mcp:?/, "") || "MCP");
  const areas = (keys: string[]) => keys.map((k) => t.system.areas[k as SystemArea] ?? k).join(", ");
  const copy = async () => { if (!file) return; try { await navigator.clipboard.writeText(file); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* download still works */ } };
  const download = () => {
    if (!file || picked === null) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([file], { type: "text/markdown" }));
    a.download = `${projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-criterio-v${picked}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="ver">
        <div className="modal__header">
          <DialogTitle className="t-title-s">{s.title}</DialogTitle>
          <DialogClose render={<IconButton icon="close" variant="default" size="s" label={t.common.close} />} />
        </div>
        <div className="modal__body ver__body">
          <DialogDescription className="ver__lead">{s.lead}</DialogDescription>
          {rows && !rows.length && <p className="ver__empty">{s.empty}</p>}
          {rows && rows.length > 0 && (
            <div className="ver__split">
              <ol className="ver__list">
                {rows.map((r, i) => (
                  <li key={r.n}>
                    <button type="button" className={`ver-row${picked === r.n ? " is-on" : ""}`} aria-pressed={picked === r.n} onClick={() => setPicked(r.n)}>
                      <span className="ver-row__head"><b>v{r.n}</b>{i === 0 && <span className="ver-row__latest">{s.latest}</span>}<span className="ver-row__when">{timeAgo(r.at, locale, t)}</span></span>
                      <span className="ver-row__what">{r.byName ? s.by(r.byName, how(r.via)) : how(r.via)}</span>
                      <span className="ver-row__what">{r.n === 1 ? s.first : r.changed.length ? s.changed(areas(r.changed)) : s.same}</span>
                    </button>
                  </li>
                ))}
              </ol>
              <div className="ver__file">
                <pre className="ver__md" tabIndex={0}>{file ?? ""}</pre>
                <div className="ver__actions">
                  <Button variant="quiet" size="s" onClick={download} disabled={!file}>{s.download}</Button>
                  <Button variant="secondary" size="s" onClick={() => void copy()} disabled={!file}>{copied ? s.copied : s.copy}</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
