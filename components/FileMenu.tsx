"use client";
import { useState } from "react";
import { useT } from "./I18nProvider";
import { Icons } from "./Sidebar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import "./SkillsMenu.css";

// The chats criterio.md opens in, at a new conversation
const CHATS = [
  { id: "claude", name: "Claude", href: "https://claude.ai/new" },
  { id: "chatgpt", name: "ChatGPT", href: "https://chatgpt.com/" },
  { id: "gemini", name: "Gemini", href: "https://gemini.google.com/app" },
] as const;

/** The other ways criterio.md leaves, behind the arrow beside Copy: downloaded as a file, or taken to a frontier
 *  chat with a first message saying what the file is. Opening in a chat takes two steps: the first click copies
 *  the whole message (the page still has the focus, so the copy goes through) and turns the row into a link to
 *  the chat; the second one opens it. Opening in the same click as the copy lost it to the new tab's focus. */
export default function FileMenu({ markdown, projectName, onDownload }: { markdown?: string; projectName: string; onDownload: () => void }) {
  const { t } = useT();
  const s = t.system.mdView;
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const copy = async (id: string) => {
    try { await navigator.clipboard.writeText(`${s.openInPrompt(projectName)}\n\n${markdown}`); setFailed(false); setReady(id); } catch { setFailed(true); }
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setReady(null); setFailed(false); } }}>
      <PopoverTrigger className="mdv-btn mdv-btn--more" aria-label={s.more} title={s.more}>{Icons.chevron}</PopoverTrigger>
      <PopoverContent align="end" className="pp sys-skills">
        <button type="button" className="sys-skills__row" onClick={() => { setOpen(false); onDownload(); }}>
          <span className="sys-skills__text"><span className="sys-skills__name">{s.download}</span></span>
        </button>
        {markdown && <>
          <p className="sys-skills__hint sys-skills__hint--section"><b>{s.openIn}</b>{failed ? s.openInFailed : s.openInHint}</p>
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
        </>}
      </PopoverContent>
    </Popover>
  );
}
