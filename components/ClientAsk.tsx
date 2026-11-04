"use client";
// The page a client opens from the link: the project's open questions, and Send. They need no account, and they see
// nothing else of the project. An answer can stay empty: the team goes on with what it has.
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Button, Icon, TextArea } from "@/components/criterio";
import { answerClientAsk } from "@/app/actions/client-ask";
import type { ClientAskView } from "@/lib/client-ask-core";
import p from "./ClientAsk.module.css";

export default function ClientAsk({ token, view }: { token: string; view: ClientAskView }) {
  const { t } = useT();
  const s = t.clientAsk;
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "busy" | "sent" | "failed">(view.questions.length ? "idle" : "sent");
  const send = async () => {
    setState("busy");
    const r = await answerClientAsk(token, answers).catch(() => "failed" as const);
    setState(r === "saved" || r === "gone" ? "sent" : "failed");
  };
  return (
    <main className={p.page}>
      <section className={`cr-card cr-card-raised ${p.card}`}>
        <h1 className="t-title-m">{view.project}</h1>
        {state === "sent" ? (
          <p className={`t-ui ${p.done}`} role="status"><Icon name="check" size={16} /> {s.sent}</p>
        ) : <>
          <p className={`t-small ${p.muted}`}>{s.lead}</p>
          {view.questions.map((q) => (
            <label key={q.id} className={p.question}>
              <span className="t-ui">{q.text}</span>
              <TextArea rows={3} value={answers[q.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))} />
            </label>
          ))}
          {state === "failed" && <p className="cr-field-hint is-error t-small" role="alert">{s.failed}</p>}
          <div className={p.foot}>
            <p className={`t-small ${p.muted}`}>{s.optional}</p>
            <Button variant="primary" onClick={() => void send()} disabled={state === "busy" || !Object.values(answers).some((v) => v.trim())}>{s.send}</Button>
          </div>
        </>}
      </section>
    </main>
  );
}
