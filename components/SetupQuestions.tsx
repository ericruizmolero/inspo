"use client";
// The setup's questions, in the app: the same ones an agent asks (lib/playbook-questions.ts SETUP_ROLES), so the two doors
// cannot drift. Each answer is saved on leaving its field. What a client or an agent wrote is shown as such.
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Button, TextArea } from "@/components/criterio";
import { PLAYBOOK_QUESTIONS, SETUP_ROLES, questionText } from "@/lib/playbook-questions";
import { saveProjectAnswer } from "@/app/actions/brief";
import { makeClientAsk } from "@/app/actions/client-ask";
import { readBrief, type Brief } from "@/types/brief";
import p from "./SetupQuestions.module.css";

const ASKED = [...PLAYBOOK_QUESTIONS].filter((q) => SETUP_ROLES[q.id] === "stops" || SETUP_ROLES[q.id] === "core").sort((a, b) => Number(SETUP_ROLES[b.id] === "stops") - Number(SETUP_ROLES[a.id] === "stops"));

export default function SetupQuestions({ projectId, brief, onError }: { projectId: string; brief: unknown; onError: (message: string) => void }) {
  const { t, locale } = useT();
  const s = t.setupQuestions;
  const [stored, setStored] = useState<Brief | null>(() => readBrief(brief));
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(ASKED.map((q) => [q.id, stored?.answers?.[q.id]?.text ?? ""])));
  const [copied, setCopied] = useState(false);
  const save = async (id: string) => {
    if (draft[id].trim() === (stored?.answers?.[id]?.text ?? "") ) return;
    const r = await saveProjectAnswer(projectId, id, draft[id]);
    if (r.ok) setStored(r.data); else onError(r.error);
  };
  const ask = async () => {
    const r = await makeClientAsk(projectId);
    if (!r.ok) { onError(r.error); return; }
    await navigator.clipboard.writeText(`${window.location.origin}/a/${r.data}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const lang = locale === "es" ? "es" : "en";
  return (
    <div className={p.list}>
      {ASKED.map((q) => {
        const source = stored?.answers?.[q.id]?.source;
        return (
          <label key={q.id} className={p.question}>
            <span className="t-ui">{questionText(q, lang, false)}</span>
            <TextArea rows={2} value={draft[q.id]} onChange={(e) => setDraft((d) => ({ ...d, [q.id]: e.target.value }))} onBlur={() => void save(q.id)} />
            {source && <span className={`t-small ${p.muted}`}>{source === "client" ? s.fromClient : s.read}</span>}
          </label>
        );
      })}
      <div className={p.foot}>
        <p className={`t-small ${p.muted}`} role="status">{copied ? s.copied : s.lead}</p>
        <Button variant="quiet" size="s" icon="link" data-tip={s.clientHint} onClick={() => void ask()}>{s.client}</Button>
      </div>
    </div>
  );
}
