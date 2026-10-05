"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "./SkillsMenu.css";

// The chats criterio.md opens in, at a new conversation
const CHATS = [
  { id: "claude", name: "Claude", href: "https://claude.ai/new" },
  { id: "chatgpt", name: "ChatGPT", href: "https://chatgpt.com/" },
  { id: "gemini", name: "Gemini", href: "https://gemini.google.com/app" },
] as const;

/** "Open in": criterio.md taken to a frontier chat, with a first message saying what the file is. Two steps:
 *  the first click copies the whole message (the page still has the focus, so the copy goes through) and turns
 *  the row into a link to the chat; the second one opens it. Opening in the same click as the copy lost it to
 *  the new tab's focus. */
export default function OpenInAI({ markdown, projectName }: { markdown: string; projectName: string }) {
  const { t } = useT();
  const s = t.system.mdView;
  const [ready, setReady] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const whole = `${s.openInPrompt(projectName)}\n\n${markdown}`;

  const copy = async (id: string) => {
    try { await navigator.clipboard.writeText(whole); setFailed(false); setReady(id); } catch { setFailed(true); }
  };

  return (
    <Popover onOpenChange={(o) => { if (!o) { setReady(null); setFailed(false); } }}>
      <PopoverTrigger className="mdv-btn" title={s.openInHint}>{s.openIn}</PopoverTrigger>
      <PopoverContent align="end" className="pp sys-skills">
        <p className="sys-skills__hint">{failed ? s.openInFailed : s.openInHint}</p>
        {CHATS.map((c) => ready === c.id
          ? (
            <a key={c.id} href={c.href} target="_blank" rel="noopener noreferrer" className="sys-skills__row is-on">
              <span className="sys-skills__text"><span className="sys-skills__name">{s.openInGo(c.name)}</span><span className="sys-skills__what">{s.openInPaste}</span></span>
            </a>
          ) : (
            <button key={c.id} type="button" className="sys-skills__row" onClick={() => void copy(c.id)}>
              <span className="sys-skills__text"><span className="sys-skills__name">{c.name}</span></span>
            </button>
          ))}
      </PopoverContent>
    </Popover>
  );
}
