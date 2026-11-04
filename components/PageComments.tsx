"use client";
// What people said about the running landing, left with the extension. An agent reads the same list (list_comments).
import { useEffect, useState } from "react";
import { useT } from "./I18nProvider";
import { Dialog, DialogWindow } from "@/components/ui/dialog";
import { Busy, Button } from "@/components/criterio";
import { closePageComment, loadPageComments } from "@/app/actions/area-comments";
import type { PageComment } from "@/lib/area-comments";
import p from "./PageComments.module.css";

export default function PageComments({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const { t } = useT();
  const s = t.pageComments;
  const [list, setList] = useState<PageComment[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void loadPageComments(projectId).then((r) => { if (r.ok) setList(r.data); else setError(r.error); }); }, [projectId]);
  const close = async (id: string) => {
    const r = await closePageComment(id);
    if (r.ok) setList((l) => l?.filter((c) => c.id !== id) ?? null); else setError(r.error);
  };
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogWindow bar={s.title} heading={s.title} closeLabel={t.common.close}>
        {error && <p className="cr-field-hint is-error t-small" role="alert">{error}</p>}
        {!list && !error ? <Busy label={s.title} /> : list?.length === 0 ? <p className={`t-small ${p.muted}`}>{s.none}</p> : (
          <ul className={p.list}>
            {list?.map((c) => (
              <li key={c.id} className={p.row}>
                <div className={p.text}>
                  <p className="t-ui">{c.body}</p>
                  <p className={`t-small ${p.muted}`}>{c.who}{c.page.section ? `, ${c.page.section}` : ""}</p>
                  <a className={`t-small ${p.muted}`} href={c.page.url} target="_blank" rel="noreferrer">{c.page.url}</a>
                </div>
                <Button size="s" onClick={() => void close(c.id)}>{s.done}</Button>
              </li>
            ))}
          </ul>
        )}
      </DialogWindow>
    </Dialog>
  );
}
