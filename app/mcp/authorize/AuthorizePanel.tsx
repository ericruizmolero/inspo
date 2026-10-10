"use client";

import { useState } from "react";
import { answerMcpAuth } from "@/app/actions/mcp";
import { useT } from "@/components/I18nProvider";
import { Button, Chip } from "@/components/criterio";
import AuthWindow from "@/components/AuthWindow";

/** The question itself: which app asks, what it will be able to do, and the two answers. The answer is checked
 *  again on the server (app/actions/mcp.ts) and comes back as the address to return to. */
export default function AuthorizePanel({ app, returnsTo, workspaces, youAre, query }: {
  app: string; returnsTo: string; workspaces: string[]; youAre: string; query: Record<string, string>;
}) {
  const { t } = useT();
  const s = t.mcp;
  const name = app || s.anApp;
  const [busy, setBusy] = useState<"allow" | "deny" | null>(null);
  const [done, setDone] = useState<"allow" | "deny" | null>(null);
  const [error, setError] = useState("");
  // The app's own machine or scheme (a desktop client): the browser hands the answer over and this tab stays
  const stays = !returnsTo || /^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(returnsTo);

  const answer = async (allow: boolean) => {
    setBusy(allow ? "allow" : "deny"); setError("");
    const r = await answerMcpAuth(query, allow).catch((e) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) }));
    if (!r.ok) { setBusy(null); setError(r.error); return; }
    setDone(allow ? "allow" : "deny");
    window.location.assign(r.data.url);
  };

  if (done) {
    return (
      <AuthWindow title={s.pageTitle} live status={t.invite.signedInAs(youAre)}
        heading={done === "deny" ? s.denied : stays ? s.doneStay(name) : s.done(name)} />
    );
  }

  return (
    <AuthWindow
      title={s.pageTitle}
      heading={s.wants(name)}
      status={t.invite.signedInAs(youAre)}
      footer={<>
        <Button onClick={() => void answer(false)} disabled={!!busy}>{s.deny}</Button>
        <Button variant="primary" onClick={() => void answer(true)} disabled={!!busy}>{busy === "allow" ? s.allowing : s.allow}</Button>
      </>}
    >
      <p className="auth__hint">{s.can}</p>
      <div className="auth-window__scope">
        <span>{s.scope}</span>
        <span className="auth-window__chips">{workspaces.map((w) => <Chip key={w}>{w}</Chip>)}</span>
      </div>
      {!stays && <p className="auth__hint">{s.returnsTo(returnsTo)}</p>}
      {error && <p className="modal__error">{error}</p>}
    </AuthWindow>
  );
}
